"use client";

import { useRef, useState, useTransition } from "react";
import { registrarMedicion } from "@/lib/actions";

export function MedicionForm({
  espacioId,
  pinId,
  tituloSugerido,
  especificacionSugerida,
  valorEsperadoSugerido,
  unidadSugerida = "cm",
  onSaved,
}: {
  espacioId: string;
  pinId?: string;
  tituloSugerido?: string;
  especificacionSugerida?: string;
  valorEsperadoSugerido?: number;
  unidadSugerida?: string;
  onSaved?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [ok, setOk] = useState<boolean | null>(null);

  return (
    <form
      ref={formRef}
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(formRef.current!);
        startTransition(async () => {
          await registrarMedicion(fd);
          formRef.current?.reset();
          setOk(true);
          onSaved?.();
        });
      }}
    >
      <input type="hidden" name="espacioId" value={espacioId} />
      {pinId && <input type="hidden" name="pinId" value={pinId} />}

      <div className="field">
        <label>Punto a verificar</label>
        <input className="input" name="titulo" defaultValue={tituloSugerido} required />
      </div>
      <div className="field">
        <label>Especificación aprobada</label>
        <input className="input" name="especificacion" defaultValue={especificacionSugerida} placeholder="ej. 500 cm alto" />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div className="field" style={{ flex: 1 }}>
          <label>Valor esperado</label>
          <input className="input" type="number" step="any" name="valorEsperado" defaultValue={valorEsperadoSugerido} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Valor medido en obra</label>
          <input className="input" type="number" step="any" name="valorMedido" required />
        </div>
        <div className="field" style={{ width: 90 }}>
          <label>Unidad</label>
          <input className="input" name="unidad" defaultValue={unidadSugerida} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div className="field" style={{ flex: 1 }}>
          <label>Tolerancia +</label>
          <input className="input" type="number" step="any" name="toleranciaMas" defaultValue={0} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Tolerancia −</label>
          <input className="input" type="number" step="any" name="toleranciaMenos" defaultValue={0} />
        </div>
      </div>
      <div className="field">
        <label>Foto de evidencia (obligatoria)</label>
        <input className="input" type="file" name="fotos" accept="image/*" capture="environment" multiple required />
      </div>
      <button className="btn btn-primary btn-block" type="submit" disabled={isPending}>
        {isPending ? "Guardando…" : "Guardar medición"}
      </button>
      {ok && !isPending && (
        <p className="text-muted" style={{ fontSize: 12 }}>
          Guardado. Si la medida está fuera de tolerancia, se abrió un incumplimiento automáticamente.
        </p>
      )}
    </form>
  );
}
