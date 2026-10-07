"use client";

import { useRef, useState, useTransition } from "react";
import { actualizarEspacio } from "@/lib/actions";
import { subirArchivoCliente } from "@/lib/subirArchivoCliente";

type FotoKey = "fotoFinal1Url" | "fotoFinal2Url";

const FOTOS: { key: FotoKey; label: string }[] = [
  { key: "fotoFinal1Url", label: "Foto 1" },
  { key: "fotoFinal2Url", label: "Foto 2" },
];

export function FotosStandFinal({
  espacioId,
  canEdit,
  fotoFinal1Url,
  fotoFinal2Url,
}: {
  espacioId: string;
  canEdit: boolean;
  fotoFinal1Url: string | null;
  fotoFinal2Url: string | null;
}) {
  const [urls, setUrls] = useState<Record<FotoKey, string | null>>({ fotoFinal1Url, fotoFinal2Url });
  const [subiendo, setSubiendo] = useState<FotoKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRefs = useRef<Partial<Record<FotoKey, HTMLInputElement | null>>>({});

  function subir(key: FotoKey, file: File) {
    setError(null);
    setSubiendo(key);
    (async () => {
      try {
        const url = await subirArchivoCliente(file, "stand-final");
        await actualizarEspacio(espacioId, { [key]: url });
        setUrls((prev) => ({ ...prev, [key]: url }));
      } catch (err: any) {
        setError(err?.message || "No se pudo subir la foto.");
      } finally {
        setSubiendo(null);
      }
    })();
  }

  function eliminar(key: FotoKey) {
    if (!confirm("¿Quitar esta foto?")) return;
    startTransition(async () => {
      await actualizarEspacio(espacioId, { [key]: "" });
      setUrls((prev) => ({ ...prev, [key]: null }));
    });
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {FOTOS.map((f) => (
          <div key={f.key} className="card" style={{ display: "flex", flexDirection: "column", gap: 8, position: "relative" }}>
            {urls[f.key] ? (
              <a href={urls[f.key]!} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={urls[f.key]!}
                  alt={`Stand finalizado · ${f.label}`}
                  style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 6, display: "block" }}
                />
              </a>
            ) : (
              <div
                className="text-muted"
                style={{
                  aspectRatio: "4 / 3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px dashed var(--color-border, #ccc)",
                  borderRadius: 6,
                  fontSize: 12,
                }}
              >
                {f.label} · sin subir
              </div>
            )}
            {canEdit && (
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <input
                  ref={(el) => {
                    inputRefs.current[f.key] = el;
                  }}
                  type="file"
                  accept="image/*"
                  disabled={subiendo === f.key}
                  style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden", pointerEvents: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) subir(f.key, file);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: 11 }}
                  disabled={subiendo === f.key || isPending}
                  onClick={() => inputRefs.current[f.key]?.click()}
                >
                  {subiendo === f.key ? "Subiendo…" : urls[f.key] ? "Reemplazar" : "Subir"}
                </button>
                {urls[f.key] && (
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ fontSize: 11, color: "var(--color-accent)" }}
                    disabled={isPending}
                    onClick={() => eliminar(f.key)}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      {error && (
        <p className="error-text" style={{ fontSize: 11, margin: "6px 0 0" }}>
          {error}
        </p>
      )}
    </>
  );
}
