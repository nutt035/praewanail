import Link from 'next/link';
import { ArrowLeft, PlayCircle, BookOpen, Clock, Award } from 'lucide-react';

export default function HowToPage() {
  return (
    <div className="min-h-screen bg-pink-50/30">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-20">

        {/* Header */}
        <div className="flex items-center mb-8 pt-4">
          <Link href="/" className="mr-4 p-2.5 rounded-full bg-white shadow-sm hover:bg-gray-50 transition-colors border border-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">วิธีการใช้งาน</h1>
            <p className="text-sm text-gray-500 mt-1">คู่มือการใช้งานระบบจองคิวร้าน Antonette Nail</p>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">

          {/* Section 1: วิธีการจองคิว */}
          <section className="bg-white rounded-3xl shadow-sm border border-pink-100 overflow-hidden">
            <div className="p-6 border-b border-pink-50/50 bg-gradient-to-r from-pink-50/50 to-white">
              <div className="flex items-center gap-3">
                <div className="bg-pink-100 text-pink-600 p-2.5 rounded-xl">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">1. วิธีการจองคิวทำเล็บ</h2>
                  <p className="text-sm text-gray-500 mt-0.5">การเลือกบริการ วันเวลา และยืนยันการจอง</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {/* YouTube Placeholder */}
              <div className="aspect-video bg-gray-50 rounded-2xl flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 relative overflow-hidden group hover:bg-gray-100 transition-colors">
                {/* 
                  💡 แอดมิน: เมื่ออัปโหลดคลิปลง YouTube แบบ Unlisted แล้ว
                  ให้นำโค้ด <iframe> ของ YouTube มาวางแทนที่เนื้อหาใน div นี้
                  ตัวอย่าง: <iframe className="w-full h-full" src="https://www.youtube.com/embed/XXXXXX" frameBorder="0" allowFullScreen></iframe>
                */}
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/OvTBX1JmNB4"
                  title="วิธีการจองคิวทำเล็บ - Antonette Nail"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                ></iframe>
              </div>
            </div>
          </section>

          {/* Section 2: ระบบสมาชิกและสะสมแต้ม */}
          <section className="bg-white rounded-3xl shadow-sm border border-pink-100 overflow-hidden">
            <div className="p-6 border-b border-pink-50/50 bg-gradient-to-r from-pink-50/50 to-white">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 text-amber-600 p-2.5 rounded-xl">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">2. ระบบสมาชิกและสะสมแต้ม</h2>
                  <p className="text-sm text-gray-500 mt-0.5">การเช็คแต้มสะสมและสิทธิพิเศษต่างๆ</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {/* YouTube Placeholder */}
              <div className="aspect-video bg-gray-50 rounded-2xl flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 relative overflow-hidden group hover:bg-gray-100 transition-colors">
                <PlayCircle className="w-12 h-12 mb-3 text-amber-300 group-hover:text-amber-400 transition-colors" />
                <p className="text-sm font-medium text-gray-500">พื้นที่สำหรับวิดีโอ YouTube</p>
                <p className="text-xs mt-1 text-gray-400">(รอการนำโค้ด iframe มาใส่)</p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
