import "server-only";

import { createHash } from "node:crypto";
import { DEFAULT_SETTINGS, getDepositAmount, settingsToMap, type Service, type ShopSettings } from "@/lib/types";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { REVIEWED_SHOP_SETTING_KEYS } from "@/lib/server/shop-context";

type ReviewService = Pick<Service, "id" | "name" | "price" | "price_per_finger" | "unit_name" | "duration" | "category">;

type KnowledgePrice = {
  label: string;
  referenceText: string;
  expectedPrice?: number;
  matches: string[];
};

const KNOWLEDGE_HOURS = {
  weekdayOpen: "17:00",
  weekdayClose: "20:00",
  weekendOpen: "11:00",
  weekendClose: "20:00",
};

const KNOWLEDGE_POLICIES = {
  booking: "แนะนำให้จองล่วงหน้า ลูกค้าที่จองคิวไว้จะได้รับคิวก่อน",
  cancellation: "",
  walkIn: "รับ Walk-in แต่ลูกค้าที่จองล่วงหน้าจะได้รับคิวก่อน และอาจต้องรอหรือเปลี่ยนวันหากคิวเต็ม",
  repair: "หากสีเจลหรือลวดลายเสียหายจากความผิดพลาดของร้าน สามารถแจ้งแก้ได้ภายใน 3 วันหลังรับบริการ",
};

const KNOWLEDGE_PRICES: KnowledgePrice[] = [
  { label: "ทำสีเจลมือ", referenceText: "150 บาท", expectedPrice: 150, matches: ["ทาสีเจลมือ"] },
  { label: "ทำสีเจลเท้า", referenceText: "299 บาท", expectedPrice: 299, matches: ["ทาสีเจลเท้า"] },
  { label: "ต่อเล็บ PVC", referenceText: "เริ่มต้น 399 บาท", expectedPrice: 399, matches: ["ต่อpvcชิดโคน", "ต่อเล็บpvc"] },
  { label: "ต่อเล็บเว้นโคน", referenceText: "เริ่มต้น 499 บาท", expectedPrice: 499, matches: ["ต่อpvcเว้นโคน", "ต่อเล็บเว้นโคน"] },
  { label: "เสริมหน้าเล็บธรรมดา", referenceText: "เริ่มต้น 399 บาท", expectedPrice: 399, matches: ["เสริมหน้าเล็บoverlay", "เสริมหน้าเล็บธรรมดา"] },
  { label: "ถอดเล็บ", referenceText: "100 บาท", expectedPrice: 100, matches: ["ถอดpvc", "ถอดเล็บ"] },
  { label: "ถอดสีเจล", referenceText: "100 บาท", expectedPrice: 100, matches: ["ล้างสีเจล", "ถอดสีเจล"] },
];

const META_KEYS = [
  "data_review_fingerprint",
  "data_review_confirmed_at",
  "data_review_confirmed_by",
  "data_review_version",
] as const;

function normalize(value: string) {
  return value.toLowerCase().replace(/[\s()\-_/]/g, "");
}

function priceReference(service: ReviewService) {
  const normalizedName = normalize(service.name);
  const reference = KNOWLEDGE_PRICES.find((item) => item.matches.some((match) => normalizedName.includes(normalize(match))));
  if (!reference) return null;

  const currentPrice = service.price_per_finger ?? service.price;
  return {
    label: reference.label,
    referenceText: reference.referenceText,
    conflicts: reference.expectedPrice !== undefined && currentPrice !== reference.expectedPrice,
  };
}

function fingerprint(services: ReviewService[], settings: Record<string, string>) {
  const canonical = {
    services: [...services]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((service) => ({
        id: service.id,
        name: service.name,
        price: service.price,
        pricePerUnit: service.price_per_finger,
        unitName: service.unit_name,
        duration: service.duration,
        category: service.category,
      })),
    settings: Object.fromEntries(
      [...REVIEWED_SHOP_SETTING_KEYS].sort().map((key) => [key, settings[key] || ""]),
    ),
  };

  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export type DataReviewValues = {
  weekdayOpen: string;
  weekdayClose: string;
  weekendOpen: string;
  weekendClose: string;
  depositAmount: number;
  bookingPolicy: string;
  cancellationPolicy: string;
  walkInPolicy: string;
  repairPolicy: string;
};

export type DataReviewData = {
  values: DataReviewValues;
  services: Array<ReviewService & { reference: ReturnType<typeof priceReference> }>;
  knowledgePrices: Array<Pick<KnowledgePrice, "label" | "referenceText">>;
  knowledgeHours: typeof KNOWLEDGE_HOURS;
  isConfirmed: boolean;
  confirmedAt: string | null;
  confirmedBy: string | null;
  conflictCount: number;
};

async function loadRawReviewData() {
  const admin = createSupabaseAdminClient();
  const [{ data: settingsData, error: settingsError }, { data: servicesData, error: servicesError }] = await Promise.all([
    admin.from("shop_settings").select("key,value").in("key", [...REVIEWED_SHOP_SETTING_KEYS, ...META_KEYS]),
    admin.from("services").select("id,name,price,price_per_finger,unit_name,duration,category").order("category").order("name"),
  ]);

  if (settingsError) throw new Error(`Could not load Data Review settings: ${settingsError.code}`);
  if (servicesError) throw new Error(`Could not load Data Review services: ${servicesError.code}`);

  const stored = settingsToMap((settingsData || []) as ShopSettings[]);
  const settings = { ...DEFAULT_SETTINGS, ...stored };
  const services = (servicesData || []) as ReviewService[];
  return { admin, stored, settings, services };
}

export async function getDataReviewData(): Promise<DataReviewData> {
  const { stored, settings, services } = await loadRawReviewData();
  const reviewedServices = services.map((service) => ({ ...service, reference: priceReference(service) }));
  const hourConflicts = [
    settings.weekday_open_time !== KNOWLEDGE_HOURS.weekdayOpen,
    settings.weekday_close_time !== KNOWLEDGE_HOURS.weekdayClose,
    settings.weekend_open_time !== KNOWLEDGE_HOURS.weekendOpen,
    settings.weekend_close_time !== KNOWLEDGE_HOURS.weekendClose,
  ].filter(Boolean).length;
  const conflictCount = reviewedServices.filter((service) => service.reference?.conflicts).length + hourConflicts;
  const currentFingerprint = fingerprint(services, settings);

  return {
    values: {
      weekdayOpen: settings.weekday_open_time,
      weekdayClose: settings.weekday_close_time,
      weekendOpen: settings.weekend_open_time,
      weekendClose: settings.weekend_close_time,
      depositAmount: getDepositAmount(settings),
      bookingPolicy: stored.booking_policy || KNOWLEDGE_POLICIES.booking,
      cancellationPolicy: stored.cancellation_policy || KNOWLEDGE_POLICIES.cancellation,
      walkInPolicy: stored.walk_in_policy || KNOWLEDGE_POLICIES.walkIn,
      repairPolicy: stored.repair_policy || KNOWLEDGE_POLICIES.repair,
    },
    services: reviewedServices,
    knowledgePrices: KNOWLEDGE_PRICES.map(({ label, referenceText }) => ({ label, referenceText })),
    knowledgeHours: KNOWLEDGE_HOURS,
    isConfirmed: Boolean(stored.data_review_fingerprint) && stored.data_review_fingerprint === currentFingerprint,
    confirmedAt: stored.data_review_confirmed_at || null,
    confirmedBy: stored.data_review_confirmed_by || null,
    conflictCount,
  };
}

export async function confirmDataReview(values: DataReviewValues, ownerEmail: string) {
  const { admin, settings, services } = await loadRawReviewData();
  const confirmedAt = new Date().toISOString();
  const nextSettings = {
    ...settings,
    weekday_open_time: values.weekdayOpen,
    weekday_close_time: values.weekdayClose,
    weekend_open_time: values.weekendOpen,
    weekend_close_time: values.weekendClose,
    deposit_amount: String(values.depositAmount),
    booking_policy: values.bookingPolicy.trim(),
    cancellation_policy: values.cancellationPolicy.trim(),
    walk_in_policy: values.walkInPolicy.trim(),
    repair_policy: values.repairPolicy.trim(),
  };
  const nextFingerprint = fingerprint(services, nextSettings);
  const rows = [
    ...REVIEWED_SHOP_SETTING_KEYS.map((key) => ({ key, value: nextSettings[key] || "" })),
    { key: "data_review_fingerprint", value: nextFingerprint },
    { key: "data_review_confirmed_at", value: confirmedAt },
    { key: "data_review_confirmed_by", value: ownerEmail },
    { key: "data_review_version", value: "1" },
  ];

  const { error } = await admin.from("shop_settings").upsert(rows, { onConflict: "key" });
  if (error) throw new Error(`Could not confirm Data Review: ${error.code}`);

  return { confirmedAt, fingerprint: nextFingerprint, settings: nextSettings, services };
}
