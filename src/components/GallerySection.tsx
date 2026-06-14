"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ShopSettings, settingsToMap } from "@/lib/types";
import { Image as ImageIcon, Search } from "lucide-react";

export default function GallerySection() {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTag, setFilterTag] = useState<string>("ทั้งหมด");
  const [allTags, setAllTags] = useState<string[]>(["ทั้งหมด"]);

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
      <section className="bg-white rounded-[2rem] shadow-sm border border-pink-50 overflow-hidden">
        <div className="p-5 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
            <ImageIcon className="text-rose-500" size={20} />
            พอร์ตผลงาน (Gallery)
          </h2>
        </div>
        <div className="p-8 bg-gray-50/50 flex flex-col items-center justify-center text-center">
           <ImageIcon size={32} className="text-gray-300 mb-2" />
           <p className="text-sm font-medium text-gray-500">รออัพเดทผลงาน</p>
           <p className="text-xs text-gray-400 mt-1">กำลังเตรียมรูปภาพสวยๆ มาอวดเร็วๆ นี้ค่ะ</p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-[2rem] shadow-sm border border-pink-50 p-6">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
            <ImageIcon className="text-rose-500" size={20} />
            พอร์ตผลงาน (Gallery)
          </h2>
          <p className="text-xs text-gray-500 mt-1">ผลงานทำเล็บสวยๆ จากทางร้าน</p>
        </div>
        
        {allTags.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setFilterTag(tag)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                  filterTag === tag
                    ? "bg-rose-500 text-white border-transparent shadow-sm"
                    : "bg-white text-slate-500 border-pink-100 hover:border-rose-300"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {displayedImages.map(img => (
          <div key={img.id} className="group relative rounded-2xl overflow-hidden aspect-square border border-pink-50 shadow-sm">
            <img 
              src={img.url} 
              alt="Nail Art" 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
            {img.tags && img.tags.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex flex-wrap gap-1">
                  {img.tags.map((tag: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-white/90 text-[10px] font-medium text-brand-dark">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {displayedImages.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Search size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">ไม่พบรูปภาพในหมวดหมู่ "{filterTag}"</p>
        </div>
      )}
    </section>
  );
}
