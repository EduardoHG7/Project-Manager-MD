"use client";

import { signOut } from "next-auth/react";

export function PortalShell({ children, userName }: { children: React.ReactNode; userName: string }) {
  return (
    <div>
      <header className="shell-header">
        <div className="shell-brand">Supervisión de montaje</div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
          <span className="text-muted">{userName}</span>
          <button className="btn btn-secondary" onClick={() => signOut({ callbackUrl: "/login" })}>
            Salir
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}
