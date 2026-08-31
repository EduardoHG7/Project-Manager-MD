"use client";

import { Fragment, useState } from "react";
import Link from "next/link";

type Stand = { numero: string; nombre: string };
type Supervisor = { id: string; nombre: string; stands: Stand[] };

function ListaStands({ stands }: { stands: Stand[] }) {
  if (stands.length === 0) {
    return (
      <p className="text-muted" style={{ margin: "4px 0" }}>
        Sin stands asignados.
      </p>
    );
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "6px 0" }}>
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
  );
}

export function SupervisoresPanel({ supervisores, sinAsignar }: { supervisores: Supervisor[]; sinAsignar: Stand[] }) {
  const [abierto, setAbierto] = useState<string | null>(null);

  function toggle(id: string) {
    setAbierto((prev) => (prev === id ? null : id));
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Supervisor</th>
          <th style={{ textAlign: "right" }}>Stands asignados</th>
        </tr>
      </thead>
      <tbody>
        {supervisores.map((s) => (
          <Fragment key={s.id}>
            <tr onClick={() => toggle(s.id)} style={{ cursor: "pointer" }}>
              <td>{s.nombre}</td>
              <td style={{ textAlign: "right", fontWeight: 800 }}>{s.stands.length}</td>
            </tr>
            {abierto === s.id && (
              <tr>
                <td colSpan={2}>
                  <ListaStands stands={s.stands} />
                </td>
              </tr>
            )}
          </Fragment>
        ))}
        {supervisores.length === 0 && (
          <tr>
            <td colSpan={2} className="text-muted">
              Todavía no hay supervisores registrados.
            </td>
          </tr>
        )}
        <tr onClick={() => toggle("__sin_asignar__")} style={{ cursor: "pointer" }}>
          <td className="text-muted">Sin asignar</td>
          <td style={{ textAlign: "right", fontWeight: 800, color: sinAsignar.length ? "var(--color-accent)" : "inherit" }}>
            {sinAsignar.length}
          </td>
        </tr>
        {abierto === "__sin_asignar__" && (
          <tr>
            <td colSpan={2}>
              <ListaStands stands={sinAsignar} />
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
