export const ESTADOS = [
  "SIN_RENDER",
  "EN_REVISION",
  "APROBADO",
  "EN_FABRICACION",
  "MONTADO",
  "VERIFICADO",
] as const;

export type Estado = (typeof ESTADOS)[number];

export const ESTADO_LABEL: Record<string, string> = {
  SIN_RENDER: "Sin render",
  EN_REVISION: "En revisión",
  APROBADO: "Aprobado",
  EN_FABRICACION: "En fabricación",
  MONTADO: "Montado",
  VERIFICADO: "Verificado",
};

export const ESTADO_FILL: Record<string, string> = {
  SIN_RENDER: "fill-sin_render",
  EN_REVISION: "fill-en_revision",
  APROBADO: "fill-aprobado",
  EN_FABRICACION: "fill-en_fabricacion",
  MONTADO: "fill-montado",
  VERIFICADO: "fill-verificado",
};

export const ESTADO_PILL: Record<string, string> = {
  SIN_RENDER: "pill-red",
  EN_REVISION: "pill-yellow",
  APROBADO: "pill-green",
  EN_FABRICACION: "pill-soft",
  MONTADO: "pill-out",
  VERIFICADO: "pill-ink",
};

export const SEVERIDAD_LABEL: Record<string, string> = {
  CRITICA: "Crítica",
  MAYOR: "Mayor",
  MENOR: "Menor",
};

export const SEVERIDAD_PILL: Record<string, string> = {
  CRITICA: "pill-red",
  MAYOR: "pill-out",
  MENOR: "pill-ghost",
};

export const INCUMP_ESTADO_LABEL: Record<string, string> = {
  ABIERTA: "Abierta",
  EN_CORRECCION: "En corrección",
  CERRADA: "Cerrada",
};

export const INCUMP_ESTADO_PILL: Record<string, string> = {
  ABIERTA: "pill-red",
  EN_CORRECCION: "pill-soft",
  CERRADA: "pill-ink",
};

export const VERSION_ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "En revisión",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
};

export const VERSION_ESTADO_PILL: Record<string, string> = {
  PENDIENTE: "pill-soft",
  APROBADA: "pill-ink",
  RECHAZADA: "pill-red",
};

export function fmtFecha(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("es-PA", { day: "2-digit", month: "short" });
}

export function esPdf(url: string | null | undefined) {
  return !!url && url.toLowerCase().endsWith(".pdf");
}

export function fmtFechaHora(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("es-PA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
