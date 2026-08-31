"use client";

import { useState, useTransition } from "react";
import { actualizarEspacio } from "@/lib/actions";
import { fmtFecha } from "@/lib/estados";

type Opcion = { id: string; nombre: string };

export function EspecificacionesEspacio({
  espacioId,
  canEdit,
  medidas,
  areaM2,
  alturaMaxCm,
  autosEnPiso,
  cargaElectricaKw,
  puntosLuz,
  proveedorId,
  proveedorNombre,
  distribuidorId,
  distribuidorNombre,
  montajeInicio,
  montajeFin,
  ultimaEntrega,
  proveedores,
  distribuidores,
}: {
  espacioId: string;
  canEdit: boolean;
  medidas: string | null;
  areaM2: number | null;
  alturaMaxCm: number;
  autosEnPiso: number | null;
  cargaElectricaKw: number | null;
  puntosLuz: string | null;
  proveedorId: string | null;
  proveedorNombre: string | null;
  distribuidorId: string | null;
  distribuidorNombre: string | null;
  montajeInicio: string | null;
  montajeFin: string | null;
  ultimaEntrega: string | null;
  proveedores: Opcion[];
  distribuidores: Opcion[];
}) {
  const [campos, setCampos] = useState({
    medidas: medidas || "",
    areaM2: areaM2 ?? "",
    alturaMaxCm: alturaMaxCm ?? "",
    autosEnPiso: autosEnPiso ?? "",
    cargaElectricaKw: cargaElectricaKw ?? "",
    puntosLuz: puntosLuz || "",
    proveedorId: proveedorId || "",
    distribuidorId: distribuidorId || "",
    montajeInicio: montajeInicio || "",
    montajeFin: montajeFin || "",
    ultimaEntrega: ultimaEntrega || "",
  });
  const [isPending, startTransition] = useTransition();

  function guardar(cambios: Record<string, string | number>) {
    setCampos((prev) => ({ ...prev, ...cambios }));
    startTransition(() => actualizarEspacio(espacioId, cambios));
  }

  if (!canEdit) {
    return (
      <>
        <tr>
          <td className="text-muted">Medidas en planta</td>
          <td style={{ textAlign: "right" }}>{medidas || "—"}</td>
        </tr>
        <tr>
          <td className="text-muted">Área</td>
          <td style={{ textAlign: "right" }}>{areaM2 ? `${areaM2} m²` : "—"}</td>
        </tr>
        <tr>
          <td className="text-muted">Altura máx. permitida</td>
          <td style={{ textAlign: "right" }}>{alturaMaxCm} cm</td>
        </tr>
        <tr>
          <td className="text-muted">Autos en piso</td>
          <td style={{ textAlign: "right" }}>{autosEnPiso ?? "—"}</td>
        </tr>
        <tr>
          <td className="text-muted">Carga eléctrica</td>
          <td style={{ textAlign: "right" }}>{cargaElectricaKw ? `${cargaElectricaKw} kW` : "—"}</td>
        </tr>
        <tr>
          <td className="text-muted">Puntos de luz</td>
          <td style={{ textAlign: "right" }}>{puntosLuz || "—"}</td>
        </tr>
        <tr>
          <td className="text-muted">Proveedor</td>
          <td style={{ textAlign: "right" }}>{proveedorNombre || "—"}</td>
        </tr>
        <tr>
          <td className="text-muted">Grupo</td>
          <td style={{ textAlign: "right" }}>{distribuidorNombre || "—"}</td>
        </tr>
        <tr>
          <td className="text-muted">Montaje</td>
          <td style={{ textAlign: "right" }}>
            {fmtFecha(montajeInicio)} – {fmtFecha(montajeFin)}
          </td>
        </tr>
        <tr>
          <td className="text-muted">Última entrega</td>
          <td style={{ textAlign: "right" }}>{fmtFecha(ultimaEntrega)}</td>
        </tr>
      </>
    );
  }

  return (
    <>
      <tr>
        <td className="text-muted">Medidas en planta</td>
        <td style={{ textAlign: "right" }}>
          <input
            className="input"
            style={{ textAlign: "right" }}
            defaultValue={campos.medidas}
            disabled={isPending}
            placeholder="15x20"
            onBlur={(e) => {
              if (e.target.value !== campos.medidas) guardar({ medidas: e.target.value });
            }}
          />
        </td>
      </tr>
      <tr>
        <td className="text-muted">Área (m²)</td>
        <td style={{ textAlign: "right" }}>
          <input
            className="input"
            type="number"
            style={{ textAlign: "right" }}
            defaultValue={campos.areaM2}
            disabled={isPending}
            onBlur={(e) => {
              if (e.target.value !== String(campos.areaM2)) guardar({ areaM2: e.target.value });
            }}
          />
        </td>
      </tr>
      <tr>
        <td className="text-muted">Altura máx. permitida (cm)</td>
        <td style={{ textAlign: "right" }}>
          <input
            className="input"
            type="number"
            required
            style={{ textAlign: "right" }}
            defaultValue={campos.alturaMaxCm}
            disabled={isPending}
            onBlur={(e) => {
              if (e.target.value !== String(campos.alturaMaxCm)) guardar({ alturaMaxCm: e.target.value });
            }}
          />
        </td>
      </tr>
      <tr>
        <td className="text-muted">Autos en piso</td>
        <td style={{ textAlign: "right" }}>
          <input
            className="input"
            type="number"
            min={0}
            style={{ textAlign: "right" }}
            defaultValue={campos.autosEnPiso}
            disabled={isPending}
            onBlur={(e) => {
              if (e.target.value !== String(campos.autosEnPiso)) guardar({ autosEnPiso: e.target.value });
            }}
          />
        </td>
      </tr>
      <tr>
        <td className="text-muted">Carga eléctrica (kW)</td>
        <td style={{ textAlign: "right" }}>
          <input
            className="input"
            type="number"
            style={{ textAlign: "right" }}
            defaultValue={campos.cargaElectricaKw}
            disabled={isPending}
            onBlur={(e) => {
              if (e.target.value !== String(campos.cargaElectricaKw)) guardar({ cargaElectricaKw: e.target.value });
            }}
          />
        </td>
      </tr>
      <tr>
        <td className="text-muted">Puntos de luz</td>
        <td style={{ textAlign: "right" }}>
          <input
            className="input"
            style={{ textAlign: "right" }}
            defaultValue={campos.puntosLuz}
            disabled={isPending}
            onBlur={(e) => {
              if (e.target.value !== campos.puntosLuz) guardar({ puntosLuz: e.target.value });
            }}
          />
        </td>
      </tr>
      <tr>
        <td className="text-muted">Proveedor</td>
        <td style={{ textAlign: "right" }}>
          <select
            className="input"
            style={{ textAlign: "right" }}
            value={campos.proveedorId}
            disabled={isPending}
            onChange={(e) => guardar({ proveedorId: e.target.value })}
          >
            <option value="">— Sin asignar —</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </td>
      </tr>
      <tr>
        <td className="text-muted">Grupo</td>
        <td style={{ textAlign: "right" }}>
          <select
            className="input"
            style={{ textAlign: "right" }}
            value={campos.distribuidorId}
            disabled={isPending}
            onChange={(e) => guardar({ distribuidorId: e.target.value })}
          >
            <option value="">— Sin asignar —</option>
            {distribuidores.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </select>
        </td>
      </tr>
      <tr>
        <td className="text-muted">Montaje (desde – hasta)</td>
        <td style={{ textAlign: "right" }}>
          <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
            <input
              className="input"
              type="date"
              defaultValue={campos.montajeInicio}
              disabled={isPending}
              onChange={(e) => guardar({ montajeInicio: e.target.value })}
            />
            <input
              className="input"
              type="date"
              defaultValue={campos.montajeFin}
              disabled={isPending}
              onChange={(e) => guardar({ montajeFin: e.target.value })}
            />
          </div>
        </td>
      </tr>
      <tr>
        <td className="text-muted">Última entrega</td>
        <td style={{ textAlign: "right" }}>
          <input
            className="input"
            type="date"
            style={{ textAlign: "right" }}
            defaultValue={campos.ultimaEntrega}
            disabled={isPending}
            onChange={(e) => guardar({ ultimaEntrega: e.target.value })}
          />
        </td>
      </tr>
    </>
  );
}
