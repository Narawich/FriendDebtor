"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("กรอกอีเมลก่อน");
      return;
    }
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (authError) {
      setError(authError.message);
      return;
    }
    setSent(true);
  };

  return (
    <div className="px-5 pt-16">
      <h1 className="text-[21px] font-medium mb-1">หนี้เพื่อน</h1>
      <p className="text-[14px] text-muted mb-6">เข้าสู่ระบบด้วยอีเมล ไม่ต้องตั้งรหัสผ่าน</p>

      {sent ? (
        <p className="text-[14px] bg-white border border-line rounded-[10px] px-4 py-3">
          ส่งลิงก์เข้าสู่ระบบไปที่ {email} แล้ว เปิดอีเมลแล้วกดลิงก์เพื่อเข้าใช้งาน
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="w-full border border-line rounded-[8px] px-3 py-2 text-[15px] bg-white focus:outline-none focus:border-debt"
          />
          {error && <p className="text-[13px] text-debt">{error}</p>}
          <button
            type="submit"
            className="w-full py-2.5 rounded-[8px] bg-ink text-white text-[14px] font-medium hover:opacity-90"
          >
            ส่งลิงก์เข้าสู่ระบบ
          </button>
        </form>
      )}
    </div>
  );
}
