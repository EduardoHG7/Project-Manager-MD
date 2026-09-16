"use client";

import { useState, useTransition } from "react";
import { asignarSupervisorEspacio } from "@/lib/actions";

type Supervisor = { id: string; nombre: string };

export function SupervisorAsignado({
  espacioId,
  canEdit,
  supervisorId,
  supervisorNombre,
  supervisores,
}: {
  espacioId: string;
  canEdit: boolean;
  supervisorId: string | null;
  supervisorNombre: string | null;
  supervisores: Supervisor[];
}) {
  const [actual, setActual] = useState(supervisorId || "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function guardar(nuevoId: string) {
    setActual(nuevoId);
    setError(null);
    startTransition(async () => {
      try {
        await asignarSupervisorEspacio(espacioId, nuevoId || null);
      } catch (err: any) {
        setActual(supervisorId || "");
        setError(err?.message || "No se pudo asignar.");
      }
    });
  }

  if (!canEdit) {
    return (
      <tr>
        <td className="text-muted">Supervisor asignado</td>
        <td style={{ textAlign: "right" }}>{supervisorNombre || "—"}</td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="text-muted">Supervisor asignado</td>
      <td style={{ textAlign: "right" }}>
        <select
          className="input"
          style={{ textAlign: "right" }}
          value={actual}
          disabled={isPending}
          onChange={(e) => guardar(e.target.value)}
        >
          <option value="">— Sin asignar —</option>
          {supervisores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
        {error && <p className="error-text" style={{ fontSize: 11, margin: "4px 0 0" }}>{error}</p>}
      </td>
    </tr>
  );
}
