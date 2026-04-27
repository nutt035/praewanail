import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { channelToken, adminUid, message, imageUrl } = await request.json();

    if (!channelToken || !adminUid) {
      return NextResponse.json({ error: "Missing LINE configuration" }, { status: 400 });
    }

    const messages: { type: string; text?: string; originalContentUrl?: string; previewImageUrl?: string }[] = [
      {
        type: "text",
        text: message,
      },
    ];

    if (imageUrl) {
      messages.push({
        type: "image",
        originalContentUrl: imageUrl,
        previewImageUrl: imageUrl,
      });
    }

    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelToken}`,
      },
      body: JSON.stringify({
        to: adminUid,
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("LINE API Error:", data);
      return NextResponse.json({ error: data.message || "Failed to send LINE message" }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notify Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
