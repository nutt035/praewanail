import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // !! เตือนความจำ: การเปิดใช้อันนี้จะทำให้ Vercel ปล่อยผ่าน Error ของ Type ทั้งหมดตอน Build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
