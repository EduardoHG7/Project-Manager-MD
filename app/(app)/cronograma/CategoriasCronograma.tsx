"use client";

import { useState, useTransition } from "react";
import { crearCategoriaProyecto, eliminarCategoriaProyecto } from "@/lib/actions-cronograma";

type Categoria = { id: string; nombre: string; orden: number };
type Tarea = { categoriaId: string };

export function CategoriasCronograma({
  eventoId,
  canEdit,
  esAdmin,
  categorias,
  tareas,
  filtroCategoriaId,
  onFiltrar,
  onCategoriaCreada,
  onCategoriaEliminada,
}: {
  eventoId: string;
  canEdit: boolean;
  esAdmin: boolean;
  categorias: Categoria[];
  tareas: Tarea[];
  filtroCategoriaId: string | null;
  onFiltrar: (id: string | null) => void;
  onCategoriaCreada: (c: Categoria) => void;
  onCategoriaEliminada: (id: string) => void;
}) {
  const [nuevaAbierta, setNuevaAbierta] = useState(false);
  const [nombreNueva, setNombreNueva] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function crear() {
    setError(null);
    const n = nombreNueva.trim();
    if (!n) return;
    startTransition(async () => {
      try {
        const creada = await crearCategoriaProyecto(eventoId, n);
        onCategoriaCreada({ id: creada.id, nombre: creada.nombre, orden: creada.orden });
        setNombreNueva("");
        setNuevaAbierta(false);
      } catch (err: any) {
        setError(err?.message || "No se pudo crear la categoría.");
      }
    });
  }

  function eliminar(categoria: Categoria) {
    if (!confirm(`¿Eliminar la categoría "${categoria.nombre}"? Solo se puede si no tiene tareas.`)) return;
    startTransition(async () => {
      try {
        await eliminarCategoriaProyecto(categoria.id);
        onCategoriaEliminada(categoria.id);
      } catch (err: any) {
        setError(err?.message || "No se pudo eliminar la categoría.");
      }
    });
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button className={`btn ${filtroCategoriaId === null ? "btn-primary" : "btn-secondary"}`} onClick={() => onFiltrar(null)}>
          Todas ({tareas.length})
        </button>
        {categorias.map((c) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <button
              className={`btn ${filtroCategoriaId === c.id ? "btn-primary" : "btn-secondary"}`}
              onClick={() => onFiltrar(c.id)}
            >
              {c.nombre} ({tareas.filter((t) => t.categoriaId === c.id).length})
            </button>
            {esAdmin && (
              <button className="btn-ghost" style={{ fontSize: 11 }} disabled={isPending} onClick={() => eliminar(c)}>
                ×
              </button>
            )}
          </div>
        ))}
        {canEdit &&
          (nuevaAbierta ? (
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <input
                className="input"
                autoFocus
                style={{ width: 160 }}
                placeholder="Nombre de la categoría"
                value={nombreNueva}
                disabled={isPending}
                onChange={(e) => setNombreNueva(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") crear();
                }}
              />
              <button className="btn btn-secondary" disabled={isPending} onClick={crear}>
                Crear
              </button>
              <button
                className="btn-ghost"
                disabled={isPending}
                onClick={() => {
                  setNuevaAbierta(false);
                  setNombreNueva("");
                  setError(null);
                }}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button className="btn-ghost" onClick={() => setNuevaAbierta(true)}>
              + Nueva categoría
            </button>
          ))}
      </div>
      {error && <p className="error-text" style={{ fontSize: 12, marginTop: 4 }}>{error}</p>}
    </div>
  );
}
