"use client";

import { useState, useTransition } from "react";
import { crearDistribuidor, eliminarDistribuidor } from "@/lib/actions";

export function DistribuidoresClient({ distribuidores }: { distribuidores: { id: string; nombre: string; stands: number }[] }) {
  const [nombre, setNombre] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 28, marginTop: 20, alignItems: "start" }}>
      <table className="table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Stands</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {distribuidores.map((d) => (
            <tr key={d.id}>
              <td>{d.nombre}</td>
              <td className="text-muted">{d.stands}</td>
              <td>
                <button
                  className="btn-ghost"
                  disabled={isPending}
                  onClick={() => {
                    if (!confirm(`¿Eliminar "${d.nombre}"? Sus espacios quedarán sin grupo asignado.`)) return;
                    startTransition(() => eliminarDistribuidor(d.id));
                  }}
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
          {distribuidores.length === 0 && (
            <tr>
              <td colSpan={3} className="text-muted">
                Todavía no hay distribuidores.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <form
        className="card elev-sm"
        onSubmit={(e) => {
          e.preventDefault();
          if (!nombre.trim()) return;
          startTransition(async () => {
            await crearDistribuidor(nombre);
            setNombre("");
          });
        }}
      >
        <h6 className="text-muted">Nuevo distribuidor</h6>
        <input className="input" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <button className="btn btn-primary btn-block" type="submit" disabled={isPending}>
          Agregar
        </button>
      </form>
    </div>
  );
}
