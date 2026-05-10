-- ============================================================
-- FIX: Row Level Security (RLS) Policies
-- รันใน Supabase Dashboard → SQL Editor → New query
-- ============================================================
-- ปัญหา: Supabase เปิด RLS ไว้โดยไม่มี Policy → INSERT/UPDATE ไม่ผ่าน
-- วิธีแก้: ปิด RLS ทุกตาราง (เหมาะสำหรับ internal admin app)

ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE booking_services DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE promotions DISABLE ROW LEVEL SECURITY;
ALTER TABLE shop_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE estimation_history DISABLE ROW LEVEL SECURITY;

-- ถ้า Phase 2 migration รันแล้ว ให้รันบรรทัดนี้ด้วย
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE line_accounts DISABLE ROW LEVEL SECURITY;

-- ตรวจสอบ: ดู RLS status ของทุกตาราง
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
