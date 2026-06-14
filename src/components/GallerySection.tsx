"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Image as ImageIcon, Search, X, ZoomIn, Heart } from "lucide-react";
import Link from "next/link";

export default function GallerySection() {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTag, setFilterTag] = useState<string>("ทั้งหมด");
  const [allTags, setAllTags] = useState<string[]>(["ทั้งหมด"]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    fetchGallery();
  }, []);

  async function fetchGallery() {
    try {
      const { data } = await supabase.from("shop_settings").select("*").eq("key", "gallery_images").single();
      if (data && data.value) {
        const parsed = JSON.parse(data.value);
        setImages(parsed);
        
        // Extract unique tags
        const tags = new Set<string>();
        parsed.forEach((img: any) => {
          if (img.tags) {
            img.tags.forEach((tag: string) => tags.add(tag));
          }
        });
        setAllTags(["ทั้งหมด", ...Array.from(tags)]);
      }
    } catch (error) {
      console.error("Error fetching gallery:", error);
    } finally {
      setLoading(false);
    }
  }

  const displayedImages = filterTag === "ทั้งหมด" 
    ? images 
    : images.filter(img => img.tags?.includes(filterTag));

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-400"></div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20">
         <ImageIcon size={48} className="text-pink-200 mb-4" />
         <p className="text-lg font-bold text-gray-800">รออัพเดทผลงาน</p>
         <p className="text-sm text-gray-500 mt-2">กำลังเตรียมรูปภาพสวยๆ มาอวดเร็วๆ นี้ค่ะ ✨</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 🏷️ Filter Tags (Instagram Story Style or Pills) */}
      <div className="mb-8 flex justify-center">
        {allTags.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setFilterTag(tag)}
                className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border-2 ${
                  filterTag === tag
                    ? "bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-200"
                    : "bg-white text-slate-500 border-pink-100 hover:border-rose-300"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 📸 Feed Layout */}
      <div className="grid grid-cols-1 gap-10 pb-10">
        {displayedImages.map(img => (
          <div key={img.id} className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-pink-50">
            {/* Image Container with aspect ratio and zoom */}
            <div 
              className="relative aspect-[4/5] bg-gray-50 cursor-pointer group"
              onClick={() => setLightboxImage(img.url)}
            >
              <img 
                src={img.url} 
                alt="Nail Art" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity scale-50 group-hover:scale-100 duration-300" size={48} />
              </div>
            </div>

            {/* Details & CTA */}
            <div className="p-5">
              <div className="flex flex-wrap gap-2 mb-4">
                {img.tags && img.tags.map((tag: string, i: number) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-rose-50 text-xs font-bold text-rose-600 border border-rose-100">
                    #{tag}
                  </span>
                ))}
              </div>
              
              <Link 
                href={`/book?notes=${encodeURIComponent(img.tags && img.tags.length > 0 ? `จองทำเล็บสไตล์: ${img.tags.join(', ')}` : "จองทำเล็บลายใน Gallery")}`}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:bg-rose-600 transition-colors active:scale-[0.98]"
              >
                <Heart size={16} /> จองคิวลายนี้เลย
              </Link>
            </div>
          </div>
        ))}
      </div>
      
      {displayedImages.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Search size={40} className="mx-auto mb-4 opacity-20" />
          <p className="text-base font-medium">ไม่พบรูปภาพในหมวดหมู่ "{filterTag}"</p>
        </div>
      )}

      {/* 🔍 Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <button 
            className="absolute top-6 right-6 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            onClick={() => setLightboxImage(null)}
          >
            <X size={24} />
          </button>
          <img 
            src={lightboxImage} 
            alt="Nail Art Fullscreen" 
            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
