"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { agregarPin } from "@/lib/actions";
import { MedicionForm } from "../../../_shared/MedicionForm";

type PinData = {
  id: string;
  numero: number;
  x: number;
  y: number;
  elemento: string;
  nota: string | null;
  resuelto: boolean;
  medicion: {
    especificacion: string;
    valorEsperado: number | null;
    valorMedido: number | null;
    unidad: string;
    conforme: boolean | null;
  } | null;
};

export function CompararClient({
  espacioId,
  numero,
  nombre,
  renderUrl,
  pins,
  canEdit,
}: {
  espacioId: string;
  numero: string;
  nombre: string;
  renderUrl: string | null;
  pins: PinData[];
  canEdit: boolean;
}) {
  const [visibles, setVisibles] = useState(true);
  const [activo, setActivo] = useState<string | null>(pins[0]?.id ?? null);
  const [nuevoPin, setNuevoPin] = useState<{ x: number; y: number } | null>(null);
  const [elemento, setElemento] = useState("");
  const [isPending, startTransition] = useTransition();

  const activePin = pins.find((p) => p.id === activo);

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!canEdit) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setNuevoPin({ x, y });
  }

  return (
    <main className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h6 className="text-muted">Comparar render vs. obra</h6>
          <h2 style={{ margin: 0 }}>
            {numero} · {nombre}
          </h2>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className={`btn ${visibles ? "btn-primary" : "btn-secondary"}`} onClick={() => setVisibles((v) => !v)}>
            Pines: {visibles ? "Visibles" : "Ocultos"}
          </button>
          <Link href={`/espacios/${encodeURIComponent(numero)}`} className="btn btn-secondary">
            ← Ficha de stand
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)", gap: 28, marginTop: 20, alignItems: "start" }}>
        <div>
          {renderUrl ? (
            <div
              className="card elev-sm"
              style={{ position: "relative", padding: 0, cursor: canEdit ? "crosshair" : "default" }}
              onClick={handleImageClick}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={renderUrl} alt={`Render de ${nombre}`} style={{ width: "100%", display: "block" }} className="grayscale" />
              {visibles &&
                pins.map((p) => (
                  <button
                    key={p.id}
                    className={`pin-marker ${p.resuelto ? "resuelto" : ""}`}
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivo(p.id);
                    }}
                  >
                    {p.numero}
                  </button>
                ))}
              {nuevoPin && (
                <span
                  className="pin-marker"
                  style={{ left: `${nuevoPin.x}%`, top: `${nuevoPin.y}%`, background: "var(--color-neutral-900)", borderColor: "var(--color-neutral-900)" }}
                >
                  +
                </span>
              )}
            </div>
          ) : (
            <div className="card elev-sm text-muted" style={{ padding: 40, textAlign: "center" }}>
              Sin imagen de referencia todavía para este espacio.
            </div>
          )}

          {canEdit && nuevoPin && (
            <form
              className="card"
              style={{ marginTop: 12 }}
              onSubmit={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  await agregarPin(espacioId, { x: nuevoPin.x, y: nuevoPin.y, elemento });
                  setNuevoPin(null);
                  setElemento("");
                });
              }}
            >
              <h6 className="text-muted">Nuevo pin en ({nuevoPin.x.toFixed(1)}%, {nuevoPin.y.toFixed(1)}%)</h6>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="input"
                  placeholder="Elemento (ej. Tótem de marca)"
                  value={elemento}
                  onChange={(e) => setElemento(e.target.value)}
                  required
                />
                <button className="btn btn-primary" type="submit" disabled={isPending}>
                  Crear pin
                </button>
                <button className="btn btn-secondary" type="button" onClick={() => setNuevoPin(null)}>
                  Cancelar
                </button>
              </div>
            </form>
          )}

          <div className="table-wrap" style={{ marginTop: 20 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Pin</th>
                  <th>Elemento</th>
                  <th>Aprobado</th>
                  <th>Medido en obra</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {pins.map((p) => (
                  <tr key={p.id} style={{ background: activo === p.id ? "var(--color-neutral-200)" : undefined }}>
                    <td>{p.numero}</td>
                    <td>{p.elemento}</td>
                    <td>{p.medicion?.especificacion || "—"}</td>
                    <td>{p.medicion ? `${p.medicion.valorMedido ?? "—"} ${p.medicion.unidad}` : "Sin medir"}</td>
                    <td>
                      <span
                        className={`pill ${
                          p.medicion?.conforme === false ? "pill-red" : p.medicion?.conforme === true ? "pill-out" : "pill-ghost"
                        }`}
                      >
                        {p.medicion?.conforme === false ? "Desviación" : p.medicion?.conforme === true ? "Conforme" : "Sin medir"}
                      </span>
                    </td>
                  </tr>
                ))}
                {pins.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted">
                      Aún no hay pines registrados para este espacio.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside>
          {activePin ? (
            <div className="card elev-sm">
              <h6 className="text-muted">Pin {activePin.numero}</h6>
              <h4 style={{ margin: 0 }}>{activePin.elemento}</h4>
              {activePin.nota && <p style={{ fontSize: 13.5 }}>{activePin.nota}</p>}
              {canEdit && (
                <MedicionForm
                  espacioId={espacioId}
                  pinId={activePin.id}
                  tituloSugerido={activePin.elemento}
                  especificacionSugerida={activePin.medicion?.especificacion}
                  valorEsperadoSugerido={activePin.medicion?.valorEsperado ?? undefined}
                  unidadSugerida={activePin.medicion?.unidad}
                />
              )}
            </div>
          ) : (
            <p className="text-muted">Selecciona un pin para ver el detalle.</p>
          )}
        </aside>
      </div>
    </main>
  );
}
