import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Password-cookie login has been retired. Use Supabase Auth." },
    { status: 410 },
  );
}
