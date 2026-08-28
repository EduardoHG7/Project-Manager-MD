"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { subirVersion } from "@/lib/actions";
import { subirArchivoCliente } from "@/lib/subirArchivoCliente";

export function SubirVersionStaffForm({ espacioId }: { espacioId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const renderRef = useRef<HTMLInputElement>(null);
  const mapaRef = useRef<HTMLInputElement>(null);
  const notaRef = useRef<HTMLTextAreaElement>(null);
  const [isPending, startTransition] = useTransition();
  const [progreso, setProgreso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  return (
    <form
      ref={formRef}
      className="card"
      style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setOk(false);
        const renders = Array.from(renderRef.current?.files || []);
        const mapa = mapaRef.current?.files?.[0];
        startTransition(async () => {
          try {
            if (renders.length === 0) throw new Error("Debes adjuntar al menos una imagen o PDF del render.");

            const renderUrls: string[] = [];
            for (let i = 0; i < renders.length; i++) {
              setProgreso(`Subiendo render ${i + 1} de ${renders.length}…`);
              renderUrls.push(await subirArchivoCliente(renders[i], "renders"));
            }

            let mapaUrl: string | undefined;
            if (mapa) {
              setProgreso("Subiendo plano…");
              mapaUrl = await subirArchivoCliente(mapa, "renders");
            }

            setProgreso(null);
            await subirVersion({ espacioId, renderUrls, mapaUrl, nota: notaRef.current?.value });
            formRef.current?.reset();
            setOk(true);
            router.refresh();
          } catch (err: any) {
            setProgreso(null);
            setError(err?.message || "No se pudo subir la versión.");
          }
        });
      }}
    >
      <h6 className="text-muted">Subir render en nombre del expositor</h6>
      <div className="field">
        <label>Render (una o más imágenes o PDF)</label>
        <input ref={renderRef} className="input" type="file" accept="image/*,application/pdf" multiple required />
      </div>
      <div className="field">
        <label>Plano / mapa del stand (opcional, imagen o PDF)</label>
        <input ref={mapaRef} className="input" type="file" accept="image/*,application/pdf" />
      </div>
      <div className="field">
        <label>Nota (opcional)</label>
        <textarea ref={notaRef} className="input" placeholder="Algo que quieras aclarar sobre esta versión" />
      </div>
      {error && <p className="error-text">{error}</p>}
      {progreso && <p className="text-muted" style={{ fontSize: 12 }}>{progreso}</p>}
      {ok && !isPending && <p className="text-muted" style={{ fontSize: 12 }}>Subido. Queda en revisión.</p>}
      <button className="btn btn-primary btn-block" type="submit" disabled={isPending}>
        {isPending ? "Subiendo…" : "Subir para revisión"}
      </button>
    </form>
  );
}
