"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Booking, ShopSettings, settingsToMap, DEFAULT_SETTINGS, isClosedDay, getOpenClose } from "@/lib/types";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

const THAI_MONTHS = [
  "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
];
const THAI_DAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

interface DayInfo {
  bookingCount: number;
  maxBookings: number;
  isFull: boolean;
  remaining: number;
}

export default function CustomerCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [shopSettings, setShopSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  useEffect(() => {
    fetchData();
  }, [year, month]);

  async function fetchData() {
    setLoading(true);

    // ดึง settings
    const { data: settingsData } = await supabase.from("shop_settings").select("*");
    if (settingsData && settingsData.length > 0) {
      setShopSettings({ ...DEFAULT_SETTINGS, ...settingsToMap(settingsData as ShopSettings[]) });
    }

    // ดึง bookings เดือนที่เลือก
    const pad = (n: number) => String(n).padStart(2, "0");
    const startStr = `${year}-${pad(month + 1)}-01T00:00:00+07:00`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endStr = `${year}-${pad(month + 1)}-${pad(lastDay)}T23:59:59+07:00`;
    const { data: bookingData } = await supabase
      .from("bookings")
      .select("start_time, end_time, status")
      .gte("start_time", startStr)
      .lte("start_time", endStr)
      .neq("status", "cancelled");

    setBookings((bookingData as Booking[]) || []);
    setLoading(false);
  }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // นับคิวต่อวัน
  function getDayInfo(day: number): DayInfo {
    const thisDate = new Date(year, month, day);
    const dow = thisDate.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const maxBookings = isWeekend 
      ? Number(shopSettings.weekend_max_bookings || shopSettings.max_bookings_per_day || 10)
      : Number(shopSettings.weekday_max_bookings || shopSettings.max_bookings_per_day || 8);
      
    const count = bookings.filter((b) => {
      const d = new Date(b.start_time);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    }).length;
    return {
      bookingCount: count,
      maxBookings: maxBookings,
      isFull: count >= maxBookings,
      remaining: Math.max(0, maxBookings - count),
    };
  }

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
    setSelectedDay(null);
  };

  // รายละเอียดวันที่เลือก
  const selectedInfo = selectedDay ? getDayInfo(selectedDay) : null;
  const selectedDate = selectedDay ? new Date(year, month, selectedDay) : null;
  const isPastSelected = selectedDate ? selectedDate < new Date(today.getFullYear(), today.getMonth(), today.getDate()) : false;

  return (
    <div className="bg-white rounded-2xl border border-pink-100 shadow-sm overflow-hidden max-w-lg mx-auto">
      {/* Header */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={prevMonth}
            className="w-8 h-8 rounded-lg bg-pink-50 text-rose-400 hover:bg-pink-100 flex items-center justify-center transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <h3 className="font-bold text-brand-dark">
            {THAI_MONTHS[month]} {year + 543}
          </h3>
          <button
            onClick={nextMonth}
            className="w-8 h-8 rounded-lg bg-pink-50 text-rose-400 hover:bg-pink-100 flex items-center justify-center transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-400">
          จ-ศ {shopSettings.weekday_open_time || shopSettings.open_time || "09:00"}-{shopSettings.weekday_close_time || shopSettings.close_time || "20:00"} น. (รับ {shopSettings.weekday_max_bookings || shopSettings.max_bookings_per_day || 8} คิว)
          <br />
          ส-อา {shopSettings.weekend_open_time || shopSettings.open_time || "10:00"}-{shopSettings.weekend_close_time || shopSettings.close_time || "18:00"} น. (รับ {shopSettings.weekend_max_bookings || shopSettings.max_bookings_per_day || 10} คิว)
        </p>
      </div>

      {/* Day headers */}
      <div className="px-5">
        <div className="grid grid-cols-7 mb-1">
          {THAI_DAYS.map((d, i) => (
            <div key={d} className={`text-center text-xs font-semibold py-1 ${i === 0 ? "text-rose-400" : "text-slate-400"}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1 pb-4">
          {[...Array(firstDay)].map((_, i) => <div key={`e-${i}`} />)}
          {[...Array(daysInMonth)].map((_, i) => {
            const day = i + 1;
            const thisDate = new Date(year, month, day);
            const isToday = today.toDateString() === thisDate.toDateString();
            const isPast = thisDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const isSelected = selectedDay === day;
            const info = getDayInfo(day);

            // สีตามสถานะ
            let dotColor = "bg-emerald-400"; // ว่าง
            if (isPast) dotColor = "";
            else if (info.isFull) dotColor = "bg-rose-400"; // เต็ม
            else if (info.bookingCount > 0) dotColor = "bg-amber-400"; // ยังว่างอยู่

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                disabled={isPast}
                className={`relative flex flex-col items-center py-2 rounded-xl transition-all text-sm font-medium
                  ${isPast ? "text-slate-250 cursor-default" :
                    isSelected ? "bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-md scale-105" :
                    isToday ? "ring-2 ring-rose-300 bg-rose-50 text-rose-600" :
                    "hover:bg-pink-50 text-slate-600"
                  }`}
              >
                <span>{day}</span>
                {!isPast && (
                  <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? "bg-white/80" : dotColor}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedInfo && selectedDate && (
        <div className="px-6 py-4 bg-gradient-to-r from-pink-50 to-rose-50 border-t border-pink-100 animate-fade-in">
          <p className="text-sm font-semibold text-brand-dark mb-2">
            {selectedDate.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          {isPastSelected ? (
            <p className="text-xs text-slate-400">วันที่ผ่านมาแล้ว</p>
          ) : selectedInfo.isFull ? (
            <div className="flex items-center gap-2 bg-rose-100 px-3 py-2 rounded-xl">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400 shrink-0" />
              <p className="text-sm text-rose-600 font-medium">คิวเต็มแล้ว ({selectedInfo.bookingCount}/{selectedInfo.maxBookings} คิว)</p>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-emerald-50 px-3 py-2 rounded-xl">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${selectedInfo.bookingCount > 0 ? "bg-amber-400" : "bg-emerald-400"}`} />
              <p className="text-sm text-emerald-700 font-medium">
                ยังว่างอีก {selectedInfo.remaining} คิว
                <span className="text-xs text-slate-400 ml-1">
                  ({selectedInfo.bookingCount}/{selectedInfo.maxBookings} จองแล้ว)
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="px-6 py-3 border-t border-pink-100 flex justify-center gap-5">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          ว่าง
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          ยังว่าง
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
          เต็ม
        </div>
      </div>
    </div>
  );
}
