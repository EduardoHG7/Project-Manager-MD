"use client";

import { useState } from "react";
import { esPdf } from "@/lib/estados";

function Visor({ url, alt }: { url: string; alt: string }) {
  if (esPdf(url)) {
    return <iframe src={url} title={alt} style={{ width: "100%", height: 520, border: "none", display: "block" }} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} style={{ width: "100%", display: "block" }} />
  );
}

export function GaleriaArchivos({ renderUrls, mapaUrl }: { renderUrls: string[]; mapaUrl?: string | null }) {
  const [activo, setActivo] = useState(0);
  const urlActivo = renderUrls[activo];

  return (
    <div>
      {urlActivo && (
        <>
          <div className="card elev-sm" style={{ padding: 0, overflow: "hidden" }}>
            <Visor url={urlActivo} alt={`Render ${activo + 1}`} />
          </div>
          {renderUrls.length > 1 && (
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {renderUrls.map((u, i) => (
                <button
                  key={u}
                  type="button"
                  className={`pill ${i === activo ? "pill-ink" : "pill-ghost"}`}
                  style={{ cursor: "pointer", border: "none" }}
                  onClick={() => setActivo(i)}
                >
                  {esPdf(u) ? "📄 " : ""}Render {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {mapaUrl && (
        <div style={{ marginTop: 20 }}>
          <h6 className="text-muted">Plano</h6>
          <div className="card elev-sm" style={{ padding: 0, overflow: "hidden", marginTop: 8 }}>
            <Visor url={mapaUrl} alt="Plano" />
          </div>
        </div>
      )}
    </div>
  );
}
