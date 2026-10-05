"use client";

import { useEffect } from "react";

// Abre el diálogo de impresión al cargar (ahí se elige "Guardar como PDF")
// y deja un botón por si el usuario lo cerró y quiere volver a abrirlo.
export function ImprimirAuto() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
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
