import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "จองคิวออนไลน์",
  description: "จองคิวทำเล็บ Antoinette Nail ออนไลน์ เลือกวันเวลาว่าง ยืนยันการจองได้ทันที",
  alternates: { canonical: "/book" },
};

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return children;
}
