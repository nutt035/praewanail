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
  open_time: "09:00",
  close_time: "20:00",
  max_bookings_per_day: "8",
  shop_name: "Praewa Nail Studio",
  shop_phone: "",
  shop_line_id: "",
  shop_ig: "",
  shop_fb: "",
  ai_pricing_rules: "ทาสีเจลพื้นฐาน (สีพื้น/ลูกแก้ว/แฟลช): 250 บาท\nงานเพ้นท์ลาย (Hand-drawn): เริ่มต้นนิ้วละ 30 - 50 บาท (ตามความยาก)\nงานปั้นนูน 3D / ขัดผง: นิ้วละ 50 บาท\nติดอะไหล่/เพชร: ชิ้นเล็ก 10 บาท, ชิ้นใหญ่/อะไหล่พรีเมียม 30 - 50 บาท",
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
