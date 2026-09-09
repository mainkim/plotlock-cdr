import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";

export function AppShell({ children, tagline }: { children: ReactNode; tagline?: string }) {
  return (
    <div className="app-shell">
      <AppHeader tagline={tagline} />
      <main className="app-main">{children}</main>
      <footer className="site-footer">
        <span>해봄 · Founder 김해인</span>
        <span className="demo-badge">DEMO / MOCK DATA</span>
      </footer>
    </div>
  );
}
