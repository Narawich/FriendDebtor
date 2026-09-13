"use client";

import { useState } from "react";

export default function LoginCodeReveal({ loginCode }: { loginCode: string }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="bg-white border border-line rounded-[10px] px-4 py-3 mb-5">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-muted">รหัสเข้าสู่ระบบ (ห้ามบอกใคร)</p>
        <button
          onClick={() => setRevealed((v) => !v)}
          className="text-[12px] text-debt underline"
        >
          {revealed ? "ซ่อน" : "แสดงรหัส"}
        </button>
      </div>
      {revealed && (
        <p className="text-[16px] font-medium tracking-wider mt-1">{loginCode}</p>
      )}
    </div>
  );
}
