"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!nickname.trim()) {
      setError("กรอกชื่อเล่นก่อน");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInAnonymously({
      options: { data: { display_name: nickname.trim() } },
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <div className="px-5 pt-16">
      <h1 className="text-[21px] font-medium mb-1">หนี้เพื่อน</h1>
      <p className="text-[14px] text-muted mb-6">ตั้งชื่อเล่นเพื่อเริ่มใช้งาน ไม่ต้องมีอีเมลหรือรหัสผ่าน</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="ชื่อเล่นของคุณ"
          maxLength={30}
          className="w-full border border-line rounded-[8px] px-3 py-2 text-[15px] bg-white focus:outline-none focus:border-debt"
          autoFocus
        />
        {error && <p className="text-[13px] text-debt">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-[8px] bg-ink text-white text-[14px] font-medium hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "กำลังเข้าใช้งาน..." : "เริ่มใช้งาน"}
        </button>
      </form>
    </div>
  );
}
