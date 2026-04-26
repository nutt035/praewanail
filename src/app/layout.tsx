import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";

// ตั้งค่าฟอนต์ Prompt (เอา variable ออก)
const prompt = Prompt({
  weight: ["300", "400", "500", "600"],
  subsets: ["latin", "thai"],
});

export const metadata: Metadata = {
  title: "Praewa Nail Studio",
  description: "ระบบจัดการคิวและสต็อกร้านทำเล็บ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      {/* เปลี่ยนมาใช้ prompt.className ตรงนี้ครับ */}
      <body className={`${prompt.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}