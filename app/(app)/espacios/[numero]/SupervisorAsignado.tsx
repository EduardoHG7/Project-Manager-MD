"use client";

import { useState, useTransition } from "react";
import { asignarSupervisorEspacio } from "@/lib/actions";

type Supervisor = { id: string; nombre: string };

export function SupervisorAsignado({
  espacioId,
  canEdit,
  esAdmin,
  userId,
  userNombre,
  supervisorId,
  supervisorNombre,
  supervisores,
}: {
  espacioId: string;
  canEdit: boolean;
  esAdmin: boolean;
  userId: string;
  userNombre: string;
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

  if (esAdmin) {
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

  // Supervisor: solo puede asignarse a sí mismo o quitar su propia asignación.
  const asignadoAMi = actual === userId;
  return (
    <tr>
      <td className="text-muted">Supervisor asignado</td>
      <td style={{ textAlign: "right" }}>
        {asignadoAMi ? (
          <button className="btn-ghost" disabled={isPending} onClick={() => guardar("")} style={{ fontSize: 12.5 }}>
            {userNombre} (yo) · quitar
          </button>
        ) : actual ? (
          <span>{supervisores.find((s) => s.id === actual)?.nombre || "—"}</span>
        ) : (
          <button className="btn-ghost" disabled={isPending} onClick={() => guardar(userId)} style={{ fontSize: 12.5 }}>
            Asignarme este stand
          </button>
        )}
        {error && <p className="error-text" style={{ fontSize: 11, margin: "4px 0 0" }}>{error}</p>}
      </td>
    </tr>
  );
}
