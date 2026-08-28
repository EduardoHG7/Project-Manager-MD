"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { agregarComentarioEspacio } from "@/lib/actions";
import { fmtFechaHora } from "@/lib/estados";

type Comentario = {
  id: string;
  texto: string;
  autor: string | null;
  fecha: string;
};

export function ComentariosEspacio({
  espacioId,
  comentarios,
  canEdit,
}: {
  espacioId: string;
  comentarios: Comentario[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {comentarios.length === 0 && <p className="text-muted">Aún no hay comentarios registrados.</p>}
        {comentarios.map((c) => (
          <div key={c.id} className="card">
            <p style={{ margin: 0, fontSize: 13.5, whiteSpace: "pre-wrap" }}>{c.texto}</p>
            <span className="text-muted" style={{ fontSize: 11, marginTop: 6, display: "block" }}>
              {c.autor || "—"} · {fmtFechaHora(c.fecha)}
            </span>
          </div>
        ))}
      </div>

      {canEdit && (
        <form
          style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const texto = textareaRef.current?.value || "";
            if (!texto.trim()) {
              setError("Escribe un comentario.");
              return;
            }
            startTransition(async () => {
              try {
                await agregarComentarioEspacio(espacioId, texto);
                if (textareaRef.current) textareaRef.current.value = "";
                router.refresh();
              } catch (err: any) {
                setError(err?.message || "No se pudo guardar el comentario.");
              }
            });
          }}
        >
          <textarea
            ref={textareaRef}
            className="input"
            placeholder="Comentario del cliente, ajuste pendiente, nota interna…"
            disabled={isPending}
          />
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-secondary" type="submit" disabled={isPending}>
            {isPending ? "Guardando…" : "Agregar comentario"}
          </button>
        </form>
      )}
    </div>
  );
}
