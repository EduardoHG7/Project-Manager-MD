"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actualizarCronograma } from "@/lib/actions";

type Evento = {
  id: string;
  fechaInicio: string;
  fechaFin: string;
  montajeInicio: string | null;
  montajeFin: string | null;
  pausaInicio: string | null;
  pausaFin: string | null;
  desmontajeInicio: string | null;
  desmontajeFin: string | null;
  horariosNota: string | null;
};

export function EditarCronograma({ evento }: { evento: Evento }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [campos, setCampos] = useState({
    fechaInicio: evento.fechaInicio,
    fechaFin: evento.fechaFin,
    montajeInicio: evento.montajeInicio || "",
    montajeFin: evento.montajeFin || "",
    pausaInicio: evento.pausaInicio || "",
    pausaFin: evento.pausaFin || "",
    desmontajeInicio: evento.desmontajeInicio || "",
    desmontajeFin: evento.desmontajeFin || "",
    horariosNota: evento.horariosNota || "",
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div style={{ margin: "12px 0" }}>
      <button className="btn btn-secondary" onClick={() => setAbierto((v) => !v)}>
        {abierto ? "Cancelar" : "Editar cronograma"}
      </button>

      {abierto && (
        <form
          className="card elev-sm"
          style={{ marginTop: 10, maxWidth: 640 }}
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            startTransition(async () => {
              try {
                await actualizarCronograma(evento.id, {
                  fechaInicio: campos.fechaInicio,
                  fechaFin: campos.fechaFin,
                  montajeInicio: campos.montajeInicio || null,
                  montajeFin: campos.montajeFin || null,
                  pausaInicio: campos.pausaInicio || null,
                  pausaFin: campos.pausaFin || null,
                  desmontajeInicio: campos.desmontajeInicio || null,
                  desmontajeFin: campos.desmontajeFin || null,
                  horariosNota: campos.horariosNota || null,
                });
                setAbierto(false);
                router.refresh();
              } catch (err: any) {
                setError(err?.message || "No se pudo guardar el cronograma.");
              }
            });
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Inicia montaje</label>
              <input
                className="input"
                type="date"
                value={campos.montajeInicio}
                onChange={(e) => setCampos({ ...campos, montajeInicio: e.target.value })}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Cierra montaje</label>
              <input
                className="input"
                type="date"
                value={campos.montajeFin}
                onChange={(e) => setCampos({ ...campos, montajeFin: e.target.value })}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Apertura</label>
              <input
                className="input"
                type="date"
                required
                value={campos.fechaInicio}
                onChange={(e) => setCampos({ ...campos, fechaInicio: e.target.value })}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Cierre</label>
              <input
                className="input"
                type="date"
                required
                value={campos.fechaFin}
                onChange={(e) => setCampos({ ...campos, fechaFin: e.target.value })}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Pausa (cerrado) desde</label>
              <input
                className="input"
                type="date"
                value={campos.pausaInicio}
                onChange={(e) => setCampos({ ...campos, pausaInicio: e.target.value })}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Pausa hasta</label>
              <input
                className="input"
                type="date"
                value={campos.pausaFin}
                onChange={(e) => setCampos({ ...campos, pausaFin: e.target.value })}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Inicia desmontaje</label>
              <input
                className="input"
                type="date"
                value={campos.desmontajeInicio}
                onChange={(e) => setCampos({ ...campos, desmontajeInicio: e.target.value })}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Cierra desmontaje</label>
              <input
                className="input"
                type="date"
                value={campos.desmontajeFin}
                onChange={(e) => setCampos({ ...campos, desmontajeFin: e.target.value })}
              />
            </div>
          </div>
          <div className="field">
            <label>Horarios de atención al público</label>
            <textarea
              className="input"
              value={campos.horariosNota}
              onChange={(e) => setCampos({ ...campos, horariosNota: e.target.value })}
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar cronograma"}
          </button>
        </form>
      )}
    </div>
  );
}
