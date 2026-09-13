import { createClient } from "@supabase/supabase-js";

// ใช้ SUPABASE_SERVICE_ROLE_KEY เท่านั้น (ไม่มี NEXT_PUBLIC_ นำหน้า)
// ห้าม import ไฟล์นี้จากโค้ดฝั่ง client เด็ดขาด ใช้ได้แค่ใน Route Handler
// (app/api/**/route.ts) หรือ Server Action เท่านั้น
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
