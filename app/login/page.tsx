"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [nickname, setNickname] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const router = useRouter();

  async function establishSession(tokenHash: string) {
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "magiclink",
    });
    if (verifyError) throw new Error(verifyError.message);
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!nickname.trim()) return setError("กรอกชื่อเล่นก่อน");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: nickname.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "สมัครไม่สำเร็จ");
      await establishSession(data.token_hash);
      setSavedCode(data.login_code);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!code.trim()) return setError("กรอกรหัสก่อน");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เข้าสู่ระบบไม่สำเร็จ");
      await establishSession(data.token_hash);
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (savedCode) {
    return (
      <div className="px-5 pt-16">
        <h1 className="text-[21px] font-medium mb-1">จดรหัสนี้ไว้ก่อนไปต่อ</h1>
        <p className="text-[14px] text-muted mb-4">
          ใช้รหัสนี้เพื่อกลับเข้าบัญชีเดิมจากเครื่องอื่นในอนาคต เก็บเป็นความลับ ห้ามบอกใคร
        </p>
        <div className="bg-white border border-line rounded-[10px] px-4 py-5 text-center mb-4">
          <p className="text-[24px] font-medium tracking-[0.2em]">{savedCode}</p>
        </div>
        <button
          onClick={() => {
            router.push("/");
            router.refresh();
          }}
          className="w-full py-2.5 rounded-[8px] bg-ink text-white text-[14px] font-medium hover:opacity-90"
        >
          บันทึกแล้ว ไปต่อ
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 pt-16">
      <h1 className="text-[21px] font-medium mb-1">หนี้เพื่อน</h1>
      <p className="text-[14px] text-muted mb-6">
        {mode === "register" ? "ตั้งชื่อเล่นเพื่อเริ่มใช้งาน ไม่ต้องมีอีเมลหรือรหัสผ่าน" : "กรอกรหัสส่วนตัวเพื่อกลับเข้าบัญชีเดิม"}
      </p>

      {mode === "register" ? (
        <form onSubmit={handleRegister} className="space-y-3">
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
            {loading ? "กำลังสร้างบัญชี..." : "เริ่มใช้งาน"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="รหัสส่วนตัว 12 หลัก"
            className="w-full border border-line rounded-[8px] px-3 py-2 text-[15px] bg-white focus:outline-none focus:border-debt tracking-wider"
            autoFocus
          />
          {error && <p className="text-[13px] text-debt">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-[8px] bg-ink text-white text-[14px] font-medium hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      )}

      <button
        onClick={() => {
          setMode(mode === "register" ? "login" : "register");
          setError("");
        }}
        className="mt-4 text-[13px] text-muted underline"
      >
        {mode === "register" ? "มีรหัสอยู่แล้ว? เข้าสู่ระบบ" : "ยังไม่มีบัญชี? ตั้งชื่อเล่นใหม่"}
      </button>
    </div>
  );
}
