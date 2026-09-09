"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HaebomLogo } from "./HaebomLogo";

export function AppHeader({ tagline = "사람의 생각과 반응을 연구하는 가장 쉬운 방법" }: { tagline?: string }) {
  const pathname = usePathname();
  const isParticipant = pathname?.startsWith("/p/") || pathname?.startsWith("/toss");

  if (isParticipant) {
    return (
      <header className="site-header participant-header">
        <Link href="/toss" className="header-brand">
          <HaebomLogo size={28} />
        </Link>
        <p className="header-tagline">해봄 참여하기</p>
      </header>
    );
  }

  return (
    <header className="site-header">
      <div className="header-left">
        <Link href="/" className="header-brand">
          <HaebomLogo />
        </Link>
        <p className="header-tagline">{tagline}</p>
      </div>
      <nav className="header-nav">
        <Link href="/">연구 홈</Link>
        <Link href="/studies/new">AI로 연구 만들기</Link>
        <Link href="/about">해커톤 소개</Link>
        <Link href="/pricing">수익모델 가설</Link>
      </nav>
    </header>
  );
}
