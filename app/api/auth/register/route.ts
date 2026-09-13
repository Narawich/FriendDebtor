import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

function generateLoginCode() {
  return crypto.randomBytes(9).toString("base64url").replace(/[-_]/g, "").slice(0, 12).toUpperCase();
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const displayName = String(body.display_name || "").trim();
  if (!displayName) {
    return NextResponse.json({ error: "กรอกชื่อเล่นก่อน" }, { status: 400 });
  }

  const admin = createAdminClient();
  const loginCode = generateLoginCode();
  const email = `${loginCode.toLowerCase()}@login.frienddebtor.internal`;

  const { data: userData, error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { display_name: displayName, login_code: loginCode },
  });
  if (createError || !userData.user) {
    return NextResponse.json(
      { error: createError?.message || "สร้างบัญชีไม่สำเร็จ" },
      { status: 500 }
    );
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError || !linkData) {
    return NextResponse.json(
      { error: linkError?.message || "สร้างลิงก์เข้าสู่ระบบไม่สำเร็จ" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    token_hash: linkData.properties?.hashed_token,
    login_code: loginCode,
  });
}
