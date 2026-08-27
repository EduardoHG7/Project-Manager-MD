"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/eventos", label: "Eventos" },
  { href: "/admin/distribuidores", label: "Distribuidores" },
  { href: "/admin/proveedores", label: "Proveedores" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <div style={{ padding: "16px 28px 0" }}>
      <div className="stat-toggle">
        {TABS.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} className={active ? "active" : ""} style={{ textDecoration: "none" }}>
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
