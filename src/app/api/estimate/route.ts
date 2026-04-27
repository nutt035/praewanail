import { NextResponse } from "next/server";
import { GoogleGenAI } from '@google/genai';
import { supabase } from "@/lib/supabase";
import { DEFAULT_SETTINGS } from "@/lib/types";

// Initialize Gemini Client
// Requires GEMINI_API_KEY in .env.local
const aiChunk = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

export async function POST(req: Request) {
  try {
    if (!aiChunk) {
      return NextResponse.json({ error: "Missing GEMINI_API_KEY environment variable. Please configure it in .env.local" }, { status: 500 });
    }

    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "No image URL provided" }, { status: 400 });
    }

    // 1. Fetch the ai_pricing_rules from shop_settings
    let pricingRules = DEFAULT_SETTINGS.ai_pricing_rules;
    const { data: settingsData, error: settingsError } = await supabase
      .from("shop_settings")
      .select("value")
      .eq("key", "ai_pricing_rules")
      .single();

    if (!settingsError && settingsData?.value) {
      pricingRules = settingsData.value;
    }

    // 2. Fetch the image and convert to Base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch image from URL" }, { status: 400 });
    }
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString("base64");
    
    // Attempt to guess mime type from URL or default to jpeg
    let mimeType = "image/jpeg";
    if (imageUrl.toLowerCase().endsWith(".png")) mimeType = "image/png";
    if (imageUrl.toLowerCase().endsWith(".webp")) mimeType = "image/webp";
    if (imageUrl.toLowerCase().endsWith(".heic")) mimeType = "image/heic";

    // 3. Construct the System Prompt
    const systemPrompt = `คุณคือช่างทำเล็บและผู้ประเมินราคาคิวทำเล็บมืออาชีพ จงวิเคราะห์รูปภาพตัวอย่างลายเล็บที่แนบมานี้ และประเมินราคาค่าทำเล็บตามโครงสร้างราคาด้านล่าง โดยต้องตอบกลับมาในรูปแบบ JSON Format เท่านั้น ห้ามมีข้อความอธิบายอื่นเจือปน

โครงสร้างราคาเบื้องต้น (อ้างอิง):
${pricingRules}

รูปแบบ JSON ที่ต้องการ:
{
  "base_price": 250,
  "add_ons": [
    {"item": "เพ้นท์ลาย 2 นิ้ว", "cost": 100},
    {"item": "ปั้นนูน 3D 1 นิ้ว", "cost": 50},
    {"item": "ติดอะไหล่ขนาดกลาง 2 ชิ้น", "cost": 60}
  ],
  "estimated_total_price": 460,
  "complexity": "Medium",
  "note": "ประเมินจากการเพ้นท์ลายตารางและติดโบว์ 3D"
}`;

    // 4. Send request to Gemini
    const aiResponse = await aiChunk.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
      }
    });

    if (!aiResponse.text) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Parse JSON
    let resultJson;
    try {
      resultJson = JSON.parse(aiResponse.text);
    } catch (parseError) {
      return NextResponse.json({ error: "AI response is not valid JSON", details: aiResponse.text }, { status: 500 });
    }

    return NextResponse.json(resultJson);
  } catch (error: unknown) {
    console.error("Estimate API Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
