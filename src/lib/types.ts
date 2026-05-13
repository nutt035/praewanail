// ============================================================
// Supabase Database Types — Praewa Nail Studio
// ============================================================

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // minutes
  price_per_finger: number | null; 
  unit_name: string | null; // e.g., "นิ้ว", "ชิ้น"
  category: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  line_id: string | null;
  points: number; // สะสมแต้ม
  notes: string | null;
  created_at: string;
}

export interface Reward {
  id: string;
  title: string;
  description: string | null;
  points_required: number;
  discount_value: number;
  is_active: boolean;
  created_at: string;
}

export interface CustomerCoupon {
  id: string;
  customer_id: string;
  reward_id: string;
  status: "active" | "used";
  created_at: string;
  used_at: string | null;
  // joined
  rewards?: Reward | null;
}

// รายการบริการย่อยภายใน 1 คิว (many-to-many)
export interface BookingService {
  id: string;
  booking_id: string;
  service_id: string | null;
  service_name: string;        // snapshot ชื่อบริการ ณ ตอนจอง
  finger_count: number | null; // null = ราคาเหมา
  unit_price: number;          // ราคาต่อหน่วย (ต่อนิ้ว หรือ ราคาเหมา)
  line_total: number;          // ยอดรวมของรายการนี้
  created_at: string;
  // relations
  services?: Service | null;
}

export interface Booking {
  id: string;
  customer_id: string | null;
  service_id: string | null;      // เดิม (keep ไว้สำหรับ backward compat)
  booking_code: string | null;    // BKG-XXXX (สำหรับลูกค้าจองเอง)
  start_time: string;
  end_time: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  total_price: number | null;
  deposit: number;
  deposit_required: number;        // จำนวนมัดจำที่ต้องจ่าย
  deposit_paid: boolean;           // จ่ายมัดจำแล้วหรือยัง
  payment_method: string | null;
  notes: string | null;
  discount_amount: number;         // ส่วนลด
  discount_type: "amount" | "percent"; // ประเภทส่วนลด
  is_practice_model: boolean;      // โหมดหุ่นลอง
  material_cost: number;           // ค่าอุปกรณ์ (สำหรับหุ่นลอง)
  design_image_url: string | null; // รูปแบบเล็บจาก LINE
  final_price: number | null;      // ราคาสุดท้ายหลัง admin ยืนยัน
  has_line_linked: boolean;        // ผูก LINE แล้วหรือยัง
  created_at: string;
  // relations (joined)
  customers?: Customer | null;
  services?: Service | null;
  booking_services?: BookingService[];
}

export interface InventoryItem {
  id: string;
  item_name: string;
  quantity: number;
  unit: string | null;
  category: string | null; // 'สีเจล/เนื้อเจล' | 'วัสดุสิ้นเปลือง' | 'ของใช้หลัก'
  min_threshold: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string | null;
  booking_id: string | null;
  created_at: string;
  // relations
  bookings?: Booking | null;
}

export interface Promotion {
  id: string;
  title: string;
  description: string | null;
  discount_type: "percent" | "amount" | "announcement";
  discount_value: number;
  valid_from: string | null;  // DATE string
  valid_to: string | null;    // DATE string
  is_active: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  payment_type: "deposit" | "final";
  payment_status: "pending" | "verified" | "failed";
  slip_verified: boolean;
  transaction_id: string | null;
  bank_info: any;
  created_at: string;
}

export interface LineAccount {
  line_user_id: string;
  customer_id: string;
  display_name: string | null;
  picture_url: string | null;
  linked_at: string;
}

export interface EstimationHistory {
  id: string;
  image_url: string;
  storage_path: string;
  base_price: number;
  add_ons: { item: string; cost: number }[];
  estimated_total_price: number;
  complexity: string | null;
  note: string | null;
  created_at: string;
}

export interface ShopSettings {
  key: string;
  value: string;
}

// Helper: แปลง settings array เป็น object
export function settingsToMap(settings: ShopSettings[]): Record<string, string> {
  const map: Record<string, string> = {};
  settings.forEach((s) => { map[s.key] = s.value; });
  return map;
}

// Default settings (ใช้เมื่อยังไม่ได้ตั้งค่า)
export const DEFAULT_SETTINGS: Record<string, string> = {
  // เวลาเปิด-ปิด (fallback)
  open_time: "09:00",
  close_time: "20:00",
  // เวลา จ-ศ
  weekday_open_time: "09:00",
  weekday_close_time: "20:00",
  // เวลา ส-อา
  weekend_open_time: "10:00",
  weekend_close_time: "18:00",
  // วันหยุดประจำสัปดาห์ (comma-separated: 0=อา, 1=จ, ..., 6=ส)
  closed_weekdays: "",
  // วันหยุดพิเศษ (comma-separated: YYYY-MM-DD)
  closed_dates: "",
  weekday_max_bookings: "8",
  weekend_max_bookings: "10",
  shop_name: "Antonette Nail",
  shop_phone: "",
  shop_line_id: "",
  shop_ig: "",
  shop_fb: "",
  line_channel_token: "",
  admin_line_uid: "",
  points_per_booking: "1",
  redeem_5_points_value: "50",
  redeem_10_points_value: "100",
  ai_pricing_rules: "ทาสีเจลพื้นฐาน (สีพื้น/ลูกแก้ว/แฟลช): 250 บาท\nงานเพ้นท์ลาย (Hand-drawn): เริ่มต้นนิ้วละ 30 - 50 บาท (ตามความยาก)\nงานปั้นนูน 3D / ขัดผง: นิ้วละ 50 บาท\nติดอะไหล่/เพชร: ชิ้นเล็ก 10 บาท, ชิ้นใหญ่/อะไหล่พรีเมียม 30 - 50 บาท",
  promptpay_id: "",
  slipok_branch_id: "",
  slipok_api_key: "",
  admin_password: "praewa1234",
};

/** ช่วยหาเวลาเปิด-ปิดตามวันของสัปดาห์ */
export function getOpenClose(date: Date, settings: Record<string, string>) {
  const dow = date.getDay(); // 0=Sun, 6=Sat
  const isWeekend = dow === 0 || dow === 6;
  return {
    openTime: isWeekend
      ? (settings.weekend_open_time || settings.open_time || "10:00")
      : (settings.weekday_open_time || settings.open_time || "09:00"),
    closeTime: isWeekend
      ? (settings.weekend_close_time || settings.close_time || "18:00")
      : (settings.weekday_close_time || settings.close_time || "20:00"),
  };
}

/** เช็คว่าวันนั้นร้านปิดหรือไม่ */
export function isClosedDay(date: Date, settings: Record<string, string>): boolean {
  const dow = date.getDay();
  const closedWeekdays = (settings.closed_weekdays || "").split(",").filter(Boolean).map(Number);
  if (closedWeekdays.includes(dow)) return true;
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const closedDates = (settings.closed_dates || "").split(",").filter(Boolean);
  return closedDates.includes(dateStr);
}

// ────────────── Helpers ──────────────

/** คำนวณราคาของ booking service item */
export function calcLineTotal(service: Service, fingerCount: number | null): number {
  if (service.price_per_finger != null && fingerCount != null) {
    return service.price_per_finger * fingerCount;
  }
  return service.price;
}

/** คำนวณส่วนลดเป็นบาท */
export function calcDiscountBaht(subtotal: number, discountAmount: number, discountType: "amount" | "percent"): number {
  if (discountType === "percent") {
    return Math.round(subtotal * discountAmount / 100);
  }
  return discountAmount;
}
