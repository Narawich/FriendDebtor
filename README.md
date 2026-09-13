# หนี้เพื่อน — Debt tracker

Next.js 14 (App Router) + Supabase

## วิธีติดตั้ง

1. สร้างโปรเจกต์ใน [Supabase](https://supabase.com) แล้วรัน `supabase-schema.sql`
   (จากไฟล์ที่ให้ไว้ก่อนหน้า) ใน SQL Editor
2. คัดลอก `.env.local.example` เป็น `.env.local` แล้วใส่ค่า:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (หาได้จาก Supabase project settings > API)
3. ติดตั้ง dependencies และรันเซิร์ฟเวอร์:
   ```
   npm install
   npm run dev
   ```
4. ไปที่ Supabase > Authentication > URL Configuration แล้วเพิ่ม
   `http://localhost:3000/auth/callback` และโดเมน Vercel จริงตอน deploy
   ลงใน Redirect URLs

## Deploy ขึ้น Vercel

1. Push โค้ดนี้ขึ้น GitHub
2. Import โปรเจกต์เข้า Vercel
3. ใส่ environment variables ตัวเดียวกับ `.env.local` ในหน้า Vercel project settings
4. Deploy

## หน้าที่มีให้

- `/login` — เข้าสู่ระบบด้วยอีเมล (magic link ไม่ต้องตั้งรหัสผ่าน)
- `/` — รายการกลุ่มที่เป็นสมาชิก พร้อมสร้างกลุ่มใหม่
- `/groups/[groupId]` — รายชื่อเพื่อนในกลุ่ม เชิญเพื่อนด้วยอีเมล
- `/groups/[groupId]/members/[memberId]` — รายการหนี้ที่ติดค้างกับคนนั้น
  เพิ่มรายการหนี้ใหม่ได้ (จำนวนเงิน, ค่าอะไร, ช่องทางชำระ, วันครบกำหนด)

## ที่ยังไม่ได้ทำ (ต่อยอดได้)

- ยังไม่ส่งอีเมลเชิญจริง (เก็บแค่คำเชิญในฐานข้อมูล รอผู้ใช้สมัคร/ล็อกอิน
  ด้วยอีเมลเดียวกันแล้วกด "รับคำเชิญ" — action `acceptInvite` เตรียมไว้ให้แล้ว
  แต่ยังไม่มี UI เรียกใช้)
- ยังไม่มีการแจ้งเตือนอัตโนมัติเมื่อใกล้ครบกำหนด (ต้องต่อ Supabase Edge
  Function + cron หรือ email/LINE service เพิ่ม)
