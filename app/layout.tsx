import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "หนี้เพื่อน",
  description: "แอปจดบันทึกหนี้ระหว่างเพื่อน",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="bg-page text-ink min-h-screen">
        <div className="max-w-md mx-auto min-h-screen bg-page">{children}</div>
      </body>
    </html>
  );
}
