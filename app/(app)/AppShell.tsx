"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const TABS = [
  { href: "/tablero", label: "Tablero" },
  { href: "/mapa", label: "Mapa" },
  { href: "/espacios", label: "Ficha de stand" },
  { href: "/obra", label: "Obra" },
  { href: "/calendario", label: "Calendario" },
  { href: "/incumplimientos", label: "Incumplimientos" },
  { href: "/directorio", label: "Directorio" },
];

export function AppShell({
  children,
  userName,
  rol,
  eventoNombre,
}: {
  children: React.ReactNode;
  userName: string;
  rol: string;
  eventoNombre?: string;
}) {
  const pathname = usePathname();

  return (
    <div>
      <header className="shell-header">
        <div className="shell-brand">
          Supervisión de montaje
          {eventoNombre && <span className="evento">{eventoNombre}</span>}
        </div>
        <nav className="tabs">
          {TABS.map((t) => {
            const active = pathname === t.href || pathname.startsWith(t.href + "/");
            return (
              <Link key={t.href} href={t.href} className={active ? "active" : ""}>
                {t.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
          <span className="text-muted">
            {userName} · {rol}
          </span>
          <button className="btn btn-secondary" onClick={() => signOut({ callbackUrl: "/login" })}>
            Salir
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}
