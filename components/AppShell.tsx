"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  CircleHelp,
  ClipboardCheck,
  FlaskConical,
  Home,
  Layers3,
  MessageSquareText,
  Play,
  Plus,
  Search,
  Settings
} from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { href: "/", id: "home", icon: Home, label: "홈" },
  { href: "/studies/new", id: "brief", icon: Bot, label: "AI 연구 브리프" },
  { href: "/studies", id: "studio", icon: Layers3, label: "조건·자극", match: "/studies/" },
  { href: "/studies", id: "measure", icon: FlaskConical, label: "측정 설계", match: "/studies/" },
  { href: "/studies", id: "review", icon: ClipboardCheck, label: "검토·승인", match: "/studies/" },
  { href: "/toss", id: "launch", icon: Play, label: "모집·실행" }
] as const;

export function HaebomLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Image
      src={compact ? "/haebom-symbol.png" : "/haebom-logo.png"}
      alt="해봄 HAEBOM RESEARCH"
      width={compact ? 40 : 174}
      height={compact ? 40 : 48}
      className="brand"
      priority
      unoptimized
    />
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isParticipant = pathname?.startsWith("/p/") || pathname?.startsWith("/toss");

  if (isParticipant && pathname?.startsWith("/p/")) {
    return (
      <div className="participant-shell">
        <header className="participant-header">
          <Link href="/toss">
            <HaebomLogo compact />
          </Link>
          <div>
            <strong>해봄 참여하기</strong>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              설문과 행동이 하나의 Participant ID로 연결됩니다
            </p>
          </div>
        </header>
        <main className="participant-main">{children}</main>
        <footer className="site-footer">
          <span>해봄 · Founder 김해인</span>
          <span className="demo-badge">DEMO / MOCK DATA</span>
        </footer>
      </div>
    );
  }

  const active = (item: (typeof nav)[number]) => {
    if (item.href === "/") return pathname === "/";
    if (item.id === "brief") return pathname === "/studies/new";
    if (item.id === "launch") return pathname?.startsWith("/toss") || pathname?.startsWith("/pricing");
    if (item.match) return pathname?.startsWith("/studies/") && pathname !== "/studies/new";
    return pathname === item.href;
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/">
          <HaebomLogo />
        </Link>
        <Link href="/studies/new" className="new-study">
          <Plus size={17} />
          <span>새 연구 만들기</span>
        </Link>
        <nav>
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.id} href={item.href} className={active(item) ? "active" : ""}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/about">
            <CircleHelp size={18} />
            <span>해커톤 소개</span>
          </Link>
          <Link href="/pricing">
            <Settings size={18} />
            <span>수익모델 가설</span>
          </Link>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="search">
            <Search size={17} />
            <span>연구, 문서, 참가자 검색</span>
            <kbd>⌘ K</kbd>
          </div>
          <div className="top-actions">
            <span className="pill mint">AI 안전 모드</span>
            <button className="icon-btn" type="button" aria-label="메시지">
              <MessageSquareText size={18} />
            </button>
            <div className="avatar">김</div>
            <span className="user-name">김해인</span>
          </div>
        </header>
        <section className="content">{children}</section>
        <footer className="site-footer">
          <span>해봄 · Founder 김해인 · 가설에서 데이터까지, 코딩 없이</span>
          <span className="demo-badge">DEMO / MOCK DATA</span>
        </footer>
      </div>
    </div>
  );
}
