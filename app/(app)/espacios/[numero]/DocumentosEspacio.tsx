"use client";

import { useRef, useState, useTransition } from "react";
import { actualizarEspacio } from "@/lib/actions";
import { subirArchivoCliente } from "@/lib/subirArchivoCliente";

type DocKey = "documentoInternetUrl" | "documentoMontacargasUrl" | "documentoVoltajeUrl" | "documentoRiggingUrl";

const DOCS: { key: DocKey; label: string }[] = [
  { key: "documentoInternetUrl", label: "Requerimiento de internet" },
  { key: "documentoMontacargasUrl", label: "Requerimiento de montacargas" },
  { key: "documentoVoltajeUrl", label: "Requerimiento de voltaje" },
  { key: "documentoRiggingUrl", label: "Requerimiento de rigging" },
];

export function DocumentosEspacio({
  espacioId,
  canEdit,
  documentoInternetUrl,
  documentoMontacargasUrl,
  documentoVoltajeUrl,
  documentoRiggingUrl,
}: {
  espacioId: string;
  canEdit: boolean;
  documentoInternetUrl: string | null;
  documentoMontacargasUrl: string | null;
  documentoVoltajeUrl: string | null;
  documentoRiggingUrl: string | null;
}) {
  const [urls, setUrls] = useState<Record<DocKey, string | null>>({
    documentoInternetUrl,
    documentoMontacargasUrl,
    documentoVoltajeUrl,
    documentoRiggingUrl,
  });
  const [subiendo, setSubiendo] = useState<DocKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRefs = useRef<Partial<Record<DocKey, HTMLInputElement | null>>>({});

  function subir(key: DocKey, file: File) {
    setError(null);
    setSubiendo(key);
    (async () => {
      try {
        const url = await subirArchivoCliente(file, "documentos");
        await actualizarEspacio(espacioId, { [key]: url });
        setUrls((prev) => ({ ...prev, [key]: url }));
      } catch (err: any) {
        setError(err?.message || "No se pudo subir el documento.");
      } finally {
        setSubiendo(null);
      }
    })();
  }

  function eliminar(key: DocKey) {
    if (!confirm("¿Quitar este documento?")) return;
    startTransition(async () => {
      await actualizarEspacio(espacioId, { [key]: "" });
      setUrls((prev) => ({ ...prev, [key]: null }));
    });
  }

  return (
    <>
      {DOCS.map((d) => (
        <tr key={d.key}>
          <td className="text-muted">{d.label}</td>
          <td style={{ textAlign: "right" }}>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap", position: "relative" }}>
              {urls[d.key] ? (
                <a href={urls[d.key]!} target="_blank" rel="noreferrer" style={{ fontSize: 12.5 }}>
                  📄 Ver documento
                </a>
              ) : (
                <span className="text-muted" style={{ fontSize: 12 }}>Sin subir</span>
              )}
              {canEdit && (
                <>
                  <input
                    ref={(el) => {
                      inputRefs.current[d.key] = el;
                    }}
                    type="file"
                    accept="image/*,application/pdf"
                    disabled={subiendo === d.key}
                    style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden", pointerEvents: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) subir(d.key, file);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ fontSize: 11 }}
                    disabled={subiendo === d.key || isPending}
                    onClick={() => inputRefs.current[d.key]?.click()}
                  >
                    {subiendo === d.key ? "Subiendo…" : urls[d.key] ? "Reemplazar" : "Subir"}
                  </button>
                  {urls[d.key] && (
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ fontSize: 11, color: "var(--color-accent)" }}
                      disabled={isPending}
                      onClick={() => eliminar(d.key)}
                    >
                      Eliminar
                    </button>
                  )}
                </>
              )}
            </div>
          </td>
        </tr>
      ))}
      {error && (
        <tr>
          <td colSpan={2}>
            <p className="error-text" style={{ fontSize: 11, margin: 0 }}>
              {error}
            </p>
          </td>
        </tr>
      )}
    </>
  );
}
