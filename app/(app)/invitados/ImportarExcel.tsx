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
  nombre: ["nombre", "invitado", "nombre completo", "nombre del invitado", "name"],
  empresa: [
    "empresa",
    "compania",
    "compañia",
    "organizacion",
    "company",
    "institucion",
    "institucion / marca",
    "marca",
  ],
  telefono: ["telefono", "tel", "celular", "whatsapp", "phone"],
  correo: ["correo", "email", "correo electronico", "e-mail", "mail"],
  notas: ["notas", "nota", "comentarios", "comentario", "notes"],
};

// Columnas que no tienen un campo propio pero cuyo valor sí queremos conservar,
// concatenado dentro de "notas" con su etiqueta original.
const CAMPOS_A_NOTAS: { alias: string[]; etiqueta: string }[] = [
  { alias: ["categoria"], etiqueta: "Categoría" },
  { alias: ["subcategoria / empresa", "subcategoria"], etiqueta: "Subcategoría" },
  { alias: ["cargo / rol", "cargo", "rol"], etiqueta: "Cargo" },
  { alias: ["origen del dato", "origen"], etiqueta: "Origen" },
];

// Columna de estatus/confirmación: si existe, cada valor distinto se convierte
// automáticamente en una etapa de seguimiento.
const ALIAS_ETAPA = ["confirmacion", "estatus", "estado", "etapa", "status"];

function elegirHoja(workbook: XLSX.WorkBook): string {
  const nombres = workbook.SheetNames;
  if (nombres.length <= 1) return nombres[0];
  const preferida = nombres.find((n) => /listado|invitados|datos|guests?/i.test(n));
  if (preferida) return preferida;
  let mejor = nombres[0];
  let mejorFilas = -1;
  for (const n of nombres) {
    const filas = XLSX.utils.sheet_to_json(workbook.Sheets[n], { defval: "" }).length;
    if (filas > mejorFilas) {
      mejorFilas = filas;
      mejor = n;
    }
  }
  return mejor;
}

type FilaInvitado = {
  nombre: string;
  empresa?: string;
  telefono?: string;
  correo?: string;
  notas?: string;
  etapaNombre?: string;
};

type EtapaLigera = { id: string; nombre: string };

type ImportResultado = {
  invitados: {
    id: string;
    nombre: string;
    empresa: string | null;
    telefono: string | null;
    correo: string | null;
    notas: string | null;
    etapaId: string | null;
  }[];
  etapas: EtapaLigera[];
};

function mapearFila(fila: Record<string, any>): Partial<FilaInvitado> {
  const out: Partial<FilaInvitado> = {};
  const notasExtra: string[] = [];
  let etapaNombre: string | undefined;

  for (const [encabezado, valor] of Object.entries(fila)) {
    const k = norm(encabezado);
    const texto = String(valor ?? "").trim();
    if (!texto) continue;

    let asignado = false;
    for (const [campo, alias] of Object.entries(CAMPOS)) {
      if (alias.includes(k) && !(campo in out)) {
        (out as Record<string, string>)[campo] = texto;
        asignado = true;
        break;
      }
    }
    if (asignado) continue;

    if (ALIAS_ETAPA.includes(k) && !etapaNombre) {
      etapaNombre = texto;
      continue;
    }

    const extra = CAMPOS_A_NOTAS.find((c) => c.alias.includes(k));
    if (extra) notasExtra.push(`${extra.etiqueta}: ${texto}`);
  }

  if (notasExtra.length > 0) {
    out.notas = out.notas ? `${out.notas} · ${notasExtra.join(" · ")}` : notasExtra.join(" · ");
  }
  if (etapaNombre) out.etapaNombre = etapaNombre;

  return out;
}

export function ImportarExcel({
  eventoId,
  onImported,
}: {
  eventoId: string;
  onImported: (resultado: ImportResultado) => void;
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
        const hoja = workbook.Sheets[elegirHoja(workbook)];
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
          const resultado = await importarInvitadosExcel(eventoId, filas);
          onImported(resultado);
          setMensaje(`Se importaron ${resultado.invitados.length} invitados.`);
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
