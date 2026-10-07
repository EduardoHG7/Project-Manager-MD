"use client";

import { useEffect } from "react";

// Abre el diálogo de impresión al cargar (ahí se elige "Guardar como PDF")
// y deja un botón por si el usuario lo cerró y quiere volver a abrirlo.
// Espera a que carguen las imágenes (fotos del stand) para que salgan en el PDF.
export function ImprimirAuto() {
  useEffect(() => {
    let cancelado = false;
    const pendientes = Array.from(document.images)
      .filter((img) => !img.complete)
      .map((img) => new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      }));
    const limite = new Promise<void>((resolve) => setTimeout(resolve, 8000));
    const t = setTimeout(() => {
      Promise.race([Promise.all(pendientes), limite]).then(() => {
        if (!cancelado) window.print();
      });
    }, 400);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, []);

  return (
    <div className="no-print" style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 16 }}>
      <button className="btn btn-secondary" onClick={() => window.close()}>
        Cerrar
      </button>
      <button className="btn btn-primary" onClick={() => window.print()}>
        Imprimir / Guardar PDF
      </button>
    </div>
  );
}
