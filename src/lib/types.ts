// ============================================================
// Supabase Database Types — Praewa Nail Studio
// ============================================================

export interface Service {
  id: string;
  name: string;
  price: number;
  price_per_finger: number | null; // null = ราคาเหมา, มีค่า = คิดต่อนิ้ว
  duration: number; // นาที
  category: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  line_id: string | null;
  notes: string | null;
  created_at: string;
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
  start_time: string;
  end_time: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  total_price: number | null;
  deposit: number;
  payment_method: string | null;
  notes: string | null;
  discount_amount: number;         // ส่วนลด
  discount_type: "amount" | "percent"; // ประเภทส่วนลด
  is_practice_model: boolean;      // โหมดหุ่นลอง
  material_cost: number;           // ค่าอุปกรณ์ (สำหรับหุ่นลอง)
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
  open_time: "09:00",
  close_time: "20:00",
  max_bookings_per_day: "8",
  shop_name: "Praewa Nail Studio",
  shop_phone: "",
  shop_line_id: "",
  shop_ig: "",
  shop_fb: "",
};

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
