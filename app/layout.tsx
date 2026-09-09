import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "해봄 · Haebom",
  description:
    "사회과학 연구자의 가설을 AI로 실제 온라인 실험으로 만들고, 설문과 행동 데이터를 하나로 연결하는 노코드 연구 플랫폼",
  icons: {
    icon: "/favicon.svg",
    apple: "/app-icon.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
