"use client";

import { useRef, useState, useTransition } from "react";
import * as XLSX from "xlsx";
import { importarInvitadosExcel } from "@/lib/actions";

function norm(s: string) {
  return s
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

const CAMPOS: Record<string, string[]> = {
  nombre: ["nombre", "invitado", "nombre completo", "name"],
  empresa: ["empresa", "compania", "organizacion", "company"],
  telefono: ["telefono", "tel", "celular", "whatsapp", "phone"],
  correo: ["correo", "email", "correo electronico", "e-mail", "mail"],
  notas: ["notas", "nota", "comentarios", "comentario", "notes"],
};

type FilaInvitado = { nombre: string; empresa?: string; telefono?: string; correo?: string; notas?: string };

type InvitadoCreado = {
  id: string;
  nombre: string;
  empresa: string | null;
  telefono: string | null;
  correo: string | null;
  notas: string | null;
  etapaId: string | null;
};

function mapearFila(fila: Record<string, any>): Partial<FilaInvitado> {
  const out: Partial<FilaInvitado> = {};
  for (const [encabezado, valor] of Object.entries(fila)) {
    const k = norm(encabezado);
    for (const [campo, alias] of Object.entries(CAMPOS)) {
      if (alias.includes(k) && !(campo in out)) {
        (out as Record<string, string>)[campo] = String(valor ?? "").trim();
        break;
      }
    }
  }
  return out;
}

export function ImportarExcel({
  eventoId,
  onImported,
}: {
  eventoId: string;
  onImported: (nuevos: InvitadoCreado[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setMensaje(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      let filas: FilaInvitado[];
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const hoja = workbook.Sheets[workbook.SheetNames[0]];
        const crudas = XLSX.utils.sheet_to_json<Record<string, any>>(hoja, { defval: "" });
        filas = crudas.map(mapearFila).filter((f): f is FilaInvitado => !!f.nombre);
      } catch {
        setError("No se pudo leer el archivo. Asegúrate de que sea un Excel (.xlsx) válido.");
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      if (filas.length === 0) {
        setError('No se encontró una columna de "Nombre" reconocible en el archivo.');
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      startTransition(async () => {
        try {
          const creados = await importarInvitadosExcel(eventoId, filas);
          onImported(creados);
          setMensaje(`Se importaron ${creados.length} invitados.`);
        } catch (err: any) {
          setError(err?.message || "No se pudo importar el archivo.");
        } finally {
          if (inputRef.current) inputRef.current.value = "";
        }
      });
    };
    reader.readAsArrayBuffer(file);
  }

  return (
    <div>
      <input
        ref={inputRef}
        id="import-excel-input"
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={onFile}
        disabled={isPending}
        style={{ display: "none" }}
      />
      <label htmlFor="import-excel-input" className="btn btn-secondary" style={{ cursor: isPending ? "not-allowed" : "pointer" }}>
        {isPending ? "Importando…" : "Importar desde Excel"}
      </label>
      {mensaje && <p style={{ fontSize: 12.5, color: "var(--color-accent-700)", margin: "6px 0 0" }}>{mensaje}</p>}
      {error && <p className="error-text" style={{ margin: "6px 0 0" }}>{error}</p>}
    </div>
  );
}
