"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { crearEspacio, actualizarEspacioAdmin, reposicionarEspacio, eliminarEspacio } from "@/lib/actions";
import { ESTADO_LABEL, ESTADO_FILL } from "@/lib/estados";

type Espacio = {
  id: string;
  numero: string;
  nombre: string;
  categoria: string;
  fila: string | null;
  medidas: string | null;
  areaM2: number | null;
  alturaMaxCm: number;
  estado: string;
  x: number | null;
  y: number | null;
  personaContacto: string | null;
  telefonoContacto: string | null;
  correoContacto: string | null;
  distribuidorId: string | null;
  proveedorId: string | null;
};

type Opcion = { id: string; nombre: string };

const CAMPOS_VACIOS = {
  numero: "",
  nombre: "",
  categoria: "AUTOMOTRIZ",
  fila: "",
  medidas: "",
  areaM2: "",
  alturaMaxCm: "550",
  personaContacto: "",
  telefonoContacto: "",
  correoContacto: "",
  distribuidorId: "",
  proveedorId: "",
};

export function AdminEspaciosClient({
  eventoId,
  eventoNombre,
  planoUrl,
  espacios,
  distribuidores,
  proveedores,
}: {
  eventoId: string;
  eventoNombre: string;
  planoUrl: string | null;
  espacios: Espacio[];
  distribuidores: Opcion[];
  proveedores: Opcion[];
}) {
  const [modo, setModo] = useState<"ver" | "agregar" | "reposicionar">("ver");
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [puntoNuevo, setPuntoNuevo] = useState<{ x: number; y: number } | null>(null);
  const [campos, setCampos] = useState(CAMPOS_VACIOS);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const seleccionado = espacios.find((e) => e.id === seleccionadoId) || null;

  function abrirEdicion(e: Espacio) {
    setModo("ver");
    setSeleccionadoId(e.id);
    setPuntoNuevo(null);
    setError(null);
    setCampos({
      numero: e.numero,
      nombre: e.nombre,
      categoria: e.categoria,
      fila: e.fila || "",
      medidas: e.medidas || "",
      areaM2: e.areaM2 != null ? String(e.areaM2) : "",
      alturaMaxCm: String(e.alturaMaxCm),
      personaContacto: e.personaContacto || "",
      telefonoContacto: e.telefonoContacto || "",
      correoContacto: e.correoContacto || "",
      distribuidorId: e.distribuidorId || "",
      proveedorId: e.proveedorId || "",
    });
  }

  function handleImageClick(ev: React.MouseEvent<HTMLDivElement>) {
    const rect = ev.currentTarget.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 100;
    const y = ((ev.clientY - rect.top) / rect.height) * 100;

    if (modo === "reposicionar" && seleccionado) {
      startTransition(async () => {
        await reposicionarEspacio(seleccionado.id, x, y);
        setModo("ver");
      });
      return;
    }

    if (modo === "agregar") {
      setSeleccionadoId(null);
      setPuntoNuevo({ x, y });
      setCampos(CAMPOS_VACIOS);
      setError(null);
    }
  }

  function datosDelFormulario() {
    return {
      numero: campos.numero,
      nombre: campos.nombre,
      categoria: campos.categoria,
      fila: campos.fila || null,
      medidas: campos.medidas || null,
      areaM2: campos.areaM2 ? Number(campos.areaM2) : null,
      alturaMaxCm: campos.alturaMaxCm ? Number(campos.alturaMaxCm) : undefined,
      personaContacto: campos.personaContacto || null,
      telefonoContacto: campos.telefonoContacto || null,
      correoContacto: campos.correoContacto || null,
      distribuidorId: campos.distribuidorId || null,
      proveedorId: campos.proveedorId || null,
    };
  }

  function guardarNuevo() {
    if (!puntoNuevo) return;
    setError(null);
    startTransition(async () => {
      try {
        await crearEspacio(eventoId, puntoNuevo.x, puntoNuevo.y, datosDelFormulario());
        setPuntoNuevo(null);
        setModo("ver");
        setCampos(CAMPOS_VACIOS);
      } catch (e: any) {
        setError(e?.message || "No se pudo crear el espacio.");
      }
    });
  }

  function guardarEdicion() {
    if (!seleccionado) return;
    setError(null);
    startTransition(async () => {
      try {
        await actualizarEspacioAdmin(seleccionado.id, datosDelFormulario());
      } catch (e: any) {
        setError(e?.message || "No se pudo guardar.");
      }
    });
  }

  function borrar() {
    if (!seleccionado) return;
    if (!confirm(`¿Eliminar el espacio ${seleccionado.numero} · ${seleccionado.nombre}? Esto borra también sus mediciones, pines e incumplimientos.`)) return;
    startTransition(async () => {
      await eliminarEspacio(seleccionado.id);
      setSeleccionadoId(null);
    });
  }

  const form = puntoNuevo || seleccionado;

  return (
    <main className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h6 className="text-muted">{eventoNombre}</h6>
          <h2 style={{ margin: 0 }}>Cargar espacios en el plano</h2>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/admin/eventos/${eventoId}`} className="btn btn-secondary">
            ← Editar evento
          </Link>
          <button
            className={`btn ${modo === "agregar" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => {
              setModo(modo === "agregar" ? "ver" : "agregar");
              setSeleccionadoId(null);
              setPuntoNuevo(null);
              setError(null);
            }}
          >
            {modo === "agregar" ? "Cancelar" : "+ Agregar espacio"}
          </button>
        </div>
      </div>

      {modo === "agregar" && (
        <p className="text-muted" style={{ marginTop: 8 }}>
          Haz clic en el punto del plano donde va el nuevo espacio.
        </p>
      )}
      {modo === "reposicionar" && (
        <p className="text-muted" style={{ marginTop: 8 }}>
          Haz clic en el nuevo punto del plano para {seleccionado?.numero}.
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)", gap: 28, marginTop: 16, alignItems: "start" }}>
        <div>
          {!planoUrl ? (
            <div className="card elev-sm text-muted" style={{ padding: 40, textAlign: "center" }}>
              Este evento no tiene plano todavía.{" "}
              <Link href={`/admin/eventos/${eventoId}`}>Súbelo aquí</Link> antes de ubicar espacios.
            </div>
          ) : (
            <div
              className="card elev-sm"
              style={{ position: "relative", padding: 0, cursor: modo === "ver" ? "default" : "crosshair" }}
              onClick={handleImageClick}
            >
              <div style={{ position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={planoUrl} alt="Plano del evento" style={{ width: "100%", display: "block" }} />
                {espacios
                  .filter((e) => e.x != null && e.y != null && e.id !== seleccionadoId)
                  .map((e) => (
                    <button
                      key={e.id}
                      className={`hotspot ${ESTADO_FILL[e.estado]}`}
                      title={`${e.numero} · ${e.nombre}`}
                      style={{ left: `${e.x}%`, top: `${e.y}%`, width: 24, height: 24, fontSize: 11 }}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        if (modo === "ver") abrirEdicion(e);
                      }}
                    >
                      {e.numero}
                    </button>
                  ))}
                {seleccionado && seleccionado.x != null && seleccionado.y != null && (
                  <span
                    className="hotspot"
                    style={{
                      left: `${seleccionado.x}%`,
                      top: `${seleccionado.y}%`,
                      width: 30,
                      height: 30,
                      fontSize: 13,
                      background: "var(--color-accent)",
                      color: "#fff",
                      boxShadow: "0 0 0 3px var(--color-accent)",
                      zIndex: 3,
                    }}
                  >
                    {seleccionado.numero}
                  </span>
                )}
                {puntoNuevo && (
                  <span
                    className="hotspot"
                    style={{
                      left: `${puntoNuevo.x}%`,
                      top: `${puntoNuevo.y}%`,
                      width: 28,
                      height: 28,
                      background: "var(--color-neutral-900)",
                      color: "#fff",
                    }}
                  >
                    +
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="table-wrap" style={{ marginTop: 20 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre</th>
                  <th>Estado</th>
                  <th>Posición</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {espacios.map((e) => (
                  <tr key={e.id} style={{ background: seleccionadoId === e.id ? "var(--color-neutral-200)" : undefined }}>
                    <td style={{ fontWeight: 700 }}>{e.numero}</td>
                    <td>{e.nombre}</td>
                    <td>{ESTADO_LABEL[e.estado]}</td>
                    <td className="text-muted">{e.x != null ? "En el plano" : "Sin ubicar"}</td>
                    <td>
                      <button className="btn-ghost" onClick={() => abrirEdicion(e)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
                {espacios.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted">
                      Todavía no hay espacios en este evento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="card elev-sm">
          {!form ? (
            <p className="text-muted">
              Haz clic en &quot;+ Agregar espacio&quot; y luego en el plano, o selecciona uno de la lista para editarlo.
            </p>
          ) : (
            <>
              <h6 className="text-muted">{puntoNuevo ? "Nuevo espacio" : `Editando ${seleccionado?.numero}`}</h6>
              <div style={{ display: "flex", gap: 8 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label>Número</label>
                  <input className="input" value={campos.numero} onChange={(e) => setCampos({ ...campos, numero: e.target.value })} />
                </div>
                <div className="field" style={{ flex: 2 }}>
                  <label>Nombre / marca</label>
                  <input className="input" value={campos.nombre} onChange={(e) => setCampos({ ...campos, nombre: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label>Categoría</label>
                  <select className="input" value={campos.categoria} onChange={(e) => setCampos({ ...campos, categoria: e.target.value })}>
                    <option value="AUTOMOTRIZ">Automotriz</option>
                    <option value="FINANCIERO">Financiero</option>
                  </select>
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>Fila / hall</label>
                  <input className="input" value={campos.fila} onChange={(e) => setCampos({ ...campos, fila: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label>Medidas</label>
                  <input className="input" placeholder="15x20" value={campos.medidas} onChange={(e) => setCampos({ ...campos, medidas: e.target.value })} />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>Área m²</label>
                  <input className="input" type="number" value={campos.areaM2} onChange={(e) => setCampos({ ...campos, areaM2: e.target.value })} />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>Altura máx. cm</label>
                  <input className="input" type="number" value={campos.alturaMaxCm} onChange={(e) => setCampos({ ...campos, alturaMaxCm: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label>Persona de contacto</label>
                <input
                  className="input"
                  value={campos.personaContacto}
                  onChange={(e) => setCampos({ ...campos, personaContacto: e.target.value })}
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label>Teléfono</label>
                  <input
                    className="input"
                    value={campos.telefonoContacto}
                    onChange={(e) => setCampos({ ...campos, telefonoContacto: e.target.value })}
                  />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>Correo</label>
                  <input
                    className="input"
                    type="email"
                    value={campos.correoContacto}
                    onChange={(e) => setCampos({ ...campos, correoContacto: e.target.value })}
                  />
                </div>
              </div>
              <div className="field">
                <label>Grupo / distribuidor</label>
                <select className="input" value={campos.distribuidorId} onChange={(e) => setCampos({ ...campos, distribuidorId: e.target.value })}>
                  <option value="">— Sin asignar —</option>
                  {distribuidores.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Proveedor constructor</label>
                <select className="input" value={campos.proveedorId} onChange={(e) => setCampos({ ...campos, proveedorId: e.target.value })}>
                  <option value="">— Sin asignar —</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {seleccionado && (
                <div className="field">
                  <label>Estado actual: {ESTADO_LABEL[seleccionado.estado]}</label>
                  <span className="text-muted" style={{ fontSize: 11.5 }}>
                    Se cambia desde la Ficha de stand, no aquí.
                  </span>
                </div>
              )}

              {error && <p className="error-text">{error}</p>}

              <button className="btn btn-primary btn-block" disabled={isPending} onClick={puntoNuevo ? guardarNuevo : guardarEdicion}>
                {isPending ? "Guardando…" : puntoNuevo ? "Crear espacio" : "Guardar cambios"}
              </button>

              {seleccionado && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModo("reposicionar")} disabled={isPending}>
                    Reposicionar en el plano
                  </button>
                  <button className="btn btn-secondary" style={{ color: "var(--color-accent)" }} onClick={borrar} disabled={isPending}>
                    Eliminar
                  </button>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
