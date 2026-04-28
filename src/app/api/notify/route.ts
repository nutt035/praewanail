import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { channelToken, adminUid, message, imageUrl } = await request.json();

    if (!channelToken || !adminUid) {
      return NextResponse.json({ error: "Missing LINE configuration" }, { status: 400 });
    }

    // Split UIDs by comma and trim whitespace
    const uids = adminUid.split(",").map((s: string) => s.trim()).filter((s: string) => s !== "");

    if (uids.length === 0) {
      return NextResponse.json({ error: "No valid Admin UIDs found" }, { status: 400 });
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

    // Send to all UIDs
    const results = await Promise.all(uids.map(async (to: string) => {
      try {
        const res = await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${channelToken}`,
          },
          body: JSON.stringify({
            to,
            messages,
          }),
        });
        return { uid: to, ok: res.ok, status: res.status };
      } catch (err) {
        return { uid: to, ok: false, error: err };
      }
    }));

    const failed = results.filter(r => !r.ok);
    if (failed.length === uids.length) {
      console.error("All LINE notifications failed:", results);
      return NextResponse.json({ error: "Failed to send LINE messages" }, { status: 500 });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Notify Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
