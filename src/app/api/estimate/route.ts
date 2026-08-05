import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from '@google/genai';
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { DEFAULT_SETTINGS } from "@/lib/types";
import { getOwnerUser } from "@/lib/server/owner-auth";
import { hasSameOrigin, takeRateLimit } from "@/lib/server/request-security";

// Initialize Gemini Client
// Requires GEMINI_API_KEY in .env.local
const aiChunk = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const estimateSchema = z.object({ imageUrl: z.string().url().max(2048) });

function isApprovedEstimateUrl(value: string) {
  try {
    const imageUrl = new URL(value);
    const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host;
    return imageUrl.protocol === "https:"
      && imageUrl.host === supabaseHost
      && imageUrl.pathname.startsWith("/storage/v1/object/public/estimations/");
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });

  const rate = takeRateLimit(req, "owner-estimate", 10, 10 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "ลองประเมินราคาถี่เกินไป กรุณารอสักครู่" }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
  }

  try {
    if (!aiChunk) {
      return NextResponse.json({ error: "Missing GEMINI_API_KEY environment variable. Please configure it in .env.local" }, { status: 500 });
    }

    const parsed = estimateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success || !isApprovedEstimateUrl(parsed.data.imageUrl)) {
      return NextResponse.json({ error: "Invalid estimation image URL" }, { status: 400 });
    }
    const { imageUrl } = parsed.data;

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
    const imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
    if (!imageResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch image from URL" }, { status: 400 });
    }
    const responseType = imageResponse.headers.get("content-type")?.split(";")[0]?.trim() || "";
    const responseLength = Number(imageResponse.headers.get("content-length") || 0);
    if (!["image/jpeg", "image/png", "image/webp"].includes(responseType)
      || (responseLength > 0 && responseLength > MAX_IMAGE_BYTES)) {
      return NextResponse.json({ error: "Unsupported or oversized image" }, { status: 400 });
    }
    const arrayBuffer = await imageResponse.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image exceeds 8 MB" }, { status: 400 });
    }
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString("base64");
    
    // Attempt to guess mime type from URL or default to jpeg
    const mimeType = responseType;

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
    } catch {
      return NextResponse.json({ error: "AI response is not valid JSON", details: aiResponse.text }, { status: 500 });
    }

    return NextResponse.json(resultJson);
  } catch (error: unknown) {
    console.error("Estimate API Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
