"use client";

import { useState } from "react";
import Link from "next/link";

type Stand = { numero: string; nombre: string };

export function RiggingPanel({ stands }: { stands: Stand[] }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div>
      <div
        onClick={() => setAbierto((v) => !v)}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", padding: "10px 0", borderBottom: "1px solid var(--color-divider)" }}
      >
        <strong style={{ fontSize: 13.5 }}>Stands con Rigging</strong>
        <span className="kpi-n" style={{ fontSize: 20 }}>{stands.length}</span>
      </div>
      {abierto && (
        <div style={{ marginTop: 10 }}>
          {stands.length === 0 ? (
            <p className="text-muted" style={{ margin: 0 }}>Ningún stand tiene rigging marcado.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {stands.map((s) => (
                <Link
                  key={s.numero}
                  href={`/espacios/${encodeURIComponent(s.numero)}`}
                  className="pill pill-soft"
                  style={{ textDecoration: "none" }}
                >
                  {s.numero} · {s.nombre}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
