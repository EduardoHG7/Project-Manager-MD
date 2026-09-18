"use client";

import { useMemo, useState } from "react";
import { CategoriasCronograma } from "./CategoriasCronograma";
import { TablaTareas } from "./TablaTareas";

type Categoria = { id: string; nombre: string; orden: number };
type Responsable = { id: string; nombre: string; iniciales: string | null; area: string | null; usuarioId: string | null };
type Tarea = {
  id: string;
  categoriaId: string;
  responsableId: string | null;
  nombre: string;
  fechaInicio: string;
  duracionDias: number;
  fechaFin: string;
  progreso: number;
  estado: string;
  esHito: boolean;
  observaciones: string | null;
};

export function CronogramaClient({
  eventoId,
  canEdit,
  esAdmin,
  miResponsableId,
  categorias,
  responsables,
  tareas,
}: {
  eventoId: string;
  canEdit: boolean;
  esAdmin: boolean;
  miResponsableId: string | null;
  categorias: Categoria[];
  responsables: Responsable[];
  tareas: Tarea[];
}) {
  const [categoriasState, setCategoriasState] = useState(categorias);
  const [responsablesState, setResponsablesState] = useState(responsables);
  const [tareasState, setTareasState] = useState(tareas);
  const [filtroCategoriaId, setFiltroCategoriaId] = useState<string | null>(null);

  const tareasFiltradas = useMemo(
    () => (filtroCategoriaId === null ? tareasState : tareasState.filter((t) => t.categoriaId === filtroCategoriaId)),
    [tareasState, filtroCategoriaId]
  );

  return (
    <div style={{ marginTop: 16 }}>
      <CategoriasCronograma
        eventoId={eventoId}
        canEdit={canEdit}
        esAdmin={esAdmin}
        categorias={categoriasState}
        tareas={tareasState}
        filtroCategoriaId={filtroCategoriaId}
        onFiltrar={setFiltroCategoriaId}
        onCategoriaCreada={(c) => setCategoriasState((prev) => [...prev, c])}
        onCategoriaEliminada={(id) => {
          setCategoriasState((prev) => prev.filter((c) => c.id !== id));
          if (filtroCategoriaId === id) setFiltroCategoriaId(null);
        }}
      />

      <TablaTareas
        eventoId={eventoId}
        canEdit={canEdit}
        miResponsableId={miResponsableId}
        categorias={categoriasState}
        responsables={responsablesState}
        tareas={tareasFiltradas}
        onTareaCreada={(t) => setTareasState((prev) => [...prev, t])}
        onTareaActualizada={(id, cambios) => setTareasState((prev) => prev.map((t) => (t.id === id ? { ...t, ...cambios } : t)))}
        onTareasEliminadas={(ids) => setTareasState((prev) => prev.filter((t) => !ids.includes(t.id)))}
        onResponsableCreado={(r) => setResponsablesState((prev) => [...prev, r])}
      />
    </div>
  );
}
