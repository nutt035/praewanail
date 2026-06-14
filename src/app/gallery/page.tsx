import GallerySection from "@/components/GallerySection";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-pink-50/40 pb-20 font-sans selection:bg-pink-200">
      <div className="bg-white px-5 py-4 flex items-center gap-3 sticky top-0 z-50 border-b border-pink-100/50 shadow-sm">
        <Link href="/" className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-bold text-gray-900 text-lg">พอร์ตผลงาน (Gallery)</h1>
      </div>
      
      <main className="max-w-md mx-auto px-5 py-8 space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-gray-900">Nail Art Gallery ✨</h2>
          <p className="text-sm text-gray-500 mt-1">รวมผลงานทำเล็บสวยๆ จากทางร้าน</p>
        </div>
        <GallerySection />
      </main>
    </div>
  );
}
