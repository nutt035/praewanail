// ============================================================
// Supabase Database Types — Praewa Nail Studio
// ============================================================

export interface Service {
  id: string;
  name: string;
  price: number;
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

export interface Booking {
  id: string;
  customer_id: string | null;
  service_id: string | null;
  start_time: string;
  end_time: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  total_price: number | null;
  deposit: number;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  // relations (joined)
  customers?: Customer | null;
  services?: Service | null;
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
