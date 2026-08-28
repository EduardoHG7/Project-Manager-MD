"use client";

import { useState, useTransition } from "react";
import { crearEspacio } from "@/lib/actions";

type Opcion = { id: string; nombre: string };

const CAMPOS_VACIOS = {
  numero: "",
  nombre: "",
  categoria: "AUTOMOTRIZ",
  medidas: "",
  areaM2: "",
  distribuidorId: "",
  proveedorId: "",
};

export function AgregarStandForm({
  eventoId,
  distribuidores,
  proveedores,
}: {
  eventoId: string;
  distribuidores: Opcion[];
  proveedores: Opcion[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [campos, setCampos] = useState(CAMPOS_VACIOS);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div style={{ marginTop: 12 }}>
      <button className="btn btn-secondary" onClick={() => setAbierto((v) => !v)}>
        {abierto ? "Cancelar" : "+ Agregar stand"}
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
                await crearEspacio(eventoId, null, null, {
                  numero: campos.numero,
                  nombre: campos.nombre,
                  categoria: campos.categoria,
                  medidas: campos.medidas || null,
                  areaM2: campos.areaM2 ? Number(campos.areaM2) : null,
                  distribuidorId: campos.distribuidorId || null,
                  proveedorId: campos.proveedorId || null,
                });
                setCampos(CAMPOS_VACIOS);
                setAbierto(false);
              } catch (err: any) {
                setError(err?.message || "No se pudo crear el stand.");
              }
            });
          }}
        >
          <p className="text-muted" style={{ fontSize: 12.5, margin: 0 }}>
            Se crea sin ubicar en el plano — puedes posicionarlo después desde Admin → Eventos → Cargar
            espacios.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Número</label>
              <input
                className="input"
                required
                value={campos.numero}
                onChange={(e) => setCampos({ ...campos, numero: e.target.value })}
              />
            </div>
            <div className="field" style={{ flex: 2 }}>
              <label>Nombre / marca</label>
              <input
                className="input"
                required
                value={campos.nombre}
                onChange={(e) => setCampos({ ...campos, nombre: e.target.value })}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Categoría</label>
              <select className="input" value={campos.categoria} onChange={(e) => setCampos({ ...campos, categoria: e.target.value })}>
                <option value="AUTOMOTRIZ">Automotriz</option>
                <option value="FINANCIERO">Financiero</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Medidas</label>
              <input
                className="input"
                placeholder="15x20"
                value={campos.medidas}
                onChange={(e) => setCampos({ ...campos, medidas: e.target.value })}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Área m²</label>
              <input
                className="input"
                type="number"
                value={campos.areaM2}
                onChange={(e) => setCampos({ ...campos, areaM2: e.target.value })}
              />
            </div>
            <div className="field" style={{ flex: 2 }}>
              <label>Grupo / distribuidor</label>
              <select
                className="input"
                value={campos.distribuidorId}
                onChange={(e) => setCampos({ ...campos, distribuidorId: e.target.value })}
              >
                <option value="">— Sin asignar —</option>
                {distribuidores.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ flex: 2 }}>
              <label>Proveedor constructor</label>
              <select
                className="input"
                value={campos.proveedorId}
                onChange={(e) => setCampos({ ...campos, proveedorId: e.target.value })}
              >
                <option value="">— Sin asignar —</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={isPending}>
            {isPending ? "Creando…" : "Crear stand"}
          </button>
        </form>
      )}
    </div>
  );
}
