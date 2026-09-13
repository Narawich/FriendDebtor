import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const code = String(body.code || "").trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "กรอกรหัสก่อน" }, { status: 400 });
  }

  const admin = createAdminClient();
  const email = `${code.toLowerCase()}@login.frienddebtor.internal`;

  const { data: linkData, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error || !linkData) {
    return NextResponse.json({ error: "ไม่พบรหัสนี้ ลองเช็คอีกครั้ง" }, { status: 404 });
  }

  return NextResponse.json({ token_hash: linkData.properties?.hashed_token });
}
