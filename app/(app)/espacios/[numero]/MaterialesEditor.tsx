"use client";

import { useState, useTransition } from "react";
import { guardarMaterial } from "@/lib/actions";

const ESTADO_LABEL: Record<string, string> = {
  CONFORME: "Conforme",
  EN_REVISION: "En revisión",
  NO_CONFORME: "No conforme",
  PENDIENTE: "Pendiente",
};

type Material = { id: string; elemento: string; material: string | null; color: string | null; estado: string };

export function MaterialesEditor({
  espacioId,
  materiales,
  canEdit,
}: {
  espacioId: string;
  materiales: Material[];
  canEdit: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [nuevo, setNuevo] = useState({ elemento: "", material: "", color: "" });

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Elemento</th>
            <th>Material / acabado</th>
            <th>Color · Pantone</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {materiales.map((m) => (
            <tr key={m.id}>
              <td style={{ fontWeight: 700 }}>{m.elemento}</td>
              <td>{m.material || "—"}</td>
              <td>{m.color || "—"}</td>
              <td>
                {canEdit ? (
                  <select
                    className="input"
                    style={{ width: "auto" }}
                    defaultValue={m.estado}
                    disabled={isPending}
                    onChange={(e) =>
                      startTransition(() =>
                        guardarMaterial(espacioId, {
                          id: m.id,
                          elemento: m.elemento,
                          material: m.material || undefined,
                          color: m.color || undefined,
                          estado: e.target.value,
                        })
                      )
                    }
                  >
                    {Object.entries(ESTADO_LABEL).map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    className={`pill ${m.estado === "NO_CONFORME" ? "pill-red" : m.estado === "CONFORME" ? "pill-ink" : "pill-soft"}`}
                  >
                    {ESTADO_LABEL[m.estado]}
                  </span>
                )}
              </td>
            </tr>
          ))}
          {materiales.length === 0 && (
            <tr>
              <td colSpan={4} className="text-muted">
                Aún no hay elementos registrados.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {canEdit && (
        <form
          style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}
          onSubmit={(e) => {
            e.preventDefault();
            if (!nuevo.elemento) return;
            startTransition(() =>
              guardarMaterial(espacioId, { elemento: nuevo.elemento, material: nuevo.material, color: nuevo.color, estado: "PENDIENTE" })
            );
            setNuevo({ elemento: "", material: "", color: "" });
          }}
        >
          <input
            className="input"
            style={{ flex: 1, minWidth: 140 }}
            placeholder="Elemento"
            value={nuevo.elemento}
            onChange={(e) => setNuevo({ ...nuevo, elemento: e.target.value })}
          />
          <input
            className="input"
            style={{ flex: 1, minWidth: 160 }}
            placeholder="Material / acabado"
            value={nuevo.material}
            onChange={(e) => setNuevo({ ...nuevo, material: e.target.value })}
          />
          <input
            className="input"
            style={{ flex: 1, minWidth: 140 }}
            placeholder="Color · Pantone"
            value={nuevo.color}
            onChange={(e) => setNuevo({ ...nuevo, color: e.target.value })}
          />
          <button className="btn btn-secondary" type="submit" disabled={isPending}>
            Agregar
          </button>
        </form>
      )}
    </div>
  );
}
