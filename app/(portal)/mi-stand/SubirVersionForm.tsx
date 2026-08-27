"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { subirVersion } from "@/lib/actions";

export function SubirVersionForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  return (
    <form
      ref={formRef}
      style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setOk(false);
        const fd = new FormData(formRef.current!);
        startTransition(async () => {
          try {
            await subirVersion(fd);
            formRef.current?.reset();
            setOk(true);
            router.refresh();
          } catch (err: any) {
            setError(err?.message || "No se pudo subir la versión.");
          }
        });
      }}
    >
      <div className="field">
        <label>Render (imagen)</label>
        <input className="input" type="file" name="render" accept="image/*" required />
      </div>
      <div className="field">
        <label>Plano / mapa del stand (opcional)</label>
        <input className="input" type="file" name="mapa" accept="image/*" />
      </div>
      <div className="field">
        <label>Nota (opcional)</label>
        <textarea className="input" name="nota" placeholder="Algo que quieras aclarar sobre esta versión" />
      </div>
      {error && <p className="error-text">{error}</p>}
      {ok && !isPending && <p className="text-muted" style={{ fontSize: 12 }}>Subido. Queda en revisión.</p>}
      <button className="btn btn-primary btn-block" type="submit" disabled={isPending}>
        {isPending ? "Subiendo…" : "Subir para revisión"}
      </button>
    </form>
  );
}
