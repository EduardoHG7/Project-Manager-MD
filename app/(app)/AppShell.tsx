"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTransition } from "react";
import { seleccionarEvento } from "@/lib/actions";

const TABS = [
  { href: "/tablero", label: "Tablero" },
  { href: "/mapa", label: "Mapa" },
  { href: "/espacios", label: "Ficha de stand" },
  { href: "/invitados", label: "Invitados" },
  { href: "/obra", label: "Obra" },
  { href: "/calendario", label: "Calendario" },
  { href: "/incumplimientos", label: "Incumplimientos" },
  { href: "/directorio", label: "Directorio" },
  { href: "/renders", label: "Renders" },
];

export function AppShell({
  children,
  userName,
  rol,
  eventos,
  eventoSeleccionadoId,
}: {
  children: React.ReactNode;
  userName: string;
  rol: string;
  eventos: { id: string; nombre: string }[];
  eventoSeleccionadoId: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const tabs = rol === "ADMIN" ? [...TABS, { href: "/admin", label: "Admin" }] : TABS;

  return (
    <div>
      <header className="shell-header" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-magicdreams.png" alt="Magic Dreams Productions" style={{ height: 40, display: "block" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <div className="shell-brand" style={{ marginRight: 0 }}>
            Supervisión de montaje
          </div>
          {eventos.length > 0 && (
            <select
              className="input"
              style={{ width: "auto", maxWidth: 280 }}
              value={eventoSeleccionadoId ?? ""}
              disabled={isPending}
              onChange={(e) =>
                startTransition(async () => {
                  await seleccionarEvento(e.target.value);
                  router.refresh();
                })
              }
            >
              {eventos.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.nombre}
                </option>
              ))}
            </select>
          )}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
            <span className="text-muted">
              {userName} · {rol}
            </span>
            <button className="btn btn-secondary" onClick={() => signOut({ callbackUrl: "/login" })}>
              Salir
            </button>
          </div>
        </div>
        <nav className="tabs">
          {tabs.map((t) => {
            const active = pathname === t.href || pathname.startsWith(t.href + "/");
            return (
              <Link key={t.href} href={t.href} className={active ? "active" : ""}>
                {t.label}
              </Link>
            );
          })}
        </nav>
      </header>
      {children}
    </div>
  );
}
