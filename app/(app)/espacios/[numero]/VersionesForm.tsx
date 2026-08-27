"use client";

import { useState, useTransition } from "react";
import { agregarVersion } from "@/lib/actions";

export function VersionesForm({ espacioId }: { espacioId: string }) {
  const [isPending, startTransition] = useTransition();
  const [version, setVersion] = useState("");
  const [estado, setEstado] = useState("En revisión");
  const [nota, setNota] = useState("");

  return (
    <form
      className="card"
      style={{ marginTop: 12 }}
      onSubmit={(e) => {
        e.preventDefault();
        if (!version) return;
        startTransition(async () => {
          await agregarVersion(espacioId, { version, estado, nota });
          setVersion("");
          setNota("");
        });
      }}
    >
      <h6 className="text-muted">Registrar nueva versión</h6>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input className="input" style={{ maxWidth: 90 }} placeholder="v4" value={version} onChange={(e) => setVersion(e.target.value)} />
        <select className="input" style={{ maxWidth: 200 }} value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option>Rechazado</option>
          <option>Cambios solicitados</option>
          <option>En revisión</option>
          <option>Aprobado</option>
        </select>
      </div>
      <textarea className="input" placeholder="Nota" value={nota} onChange={(e) => setNota(e.target.value)} />
      <button className="btn btn-primary btn-block" type="submit" disabled={isPending}>
        Guardar versión
      </button>
    </form>
  );
}
