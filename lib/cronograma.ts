// Lógica pura del módulo Cronograma (categorías/tareas de planeación del
// proyecto) — sin acceso a base de datos, para poder probarla con Vitest.

export const NOMBRES_CATEGORIAS_DEFECTO = [
  "Local",
  "Presupuesto",
  "Reglamento",
  "Planos",
  "Propuesta y Stands",
  "Publicidad",
  "Proveedores",
  "Permisos",
  "Eventos",
  "Feria",
];

// Días corridos, sin excluir fines de semana ni feriados.
export function calcularFechaFin(fechaInicio: Date, duracionDias: number): Date {
  const d = new Date(fechaInicio);
  d.setDate(d.getDate() + Math.max(1, duracionDias) - 1);
  return d;
}

function soloFecha(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// "Atrasada" pisa a las demás reglas incluso con progreso 0.
export function calcularEstado(p: { progreso: number; fechaFin: Date; hoy?: Date }): string {
  const hoyISO = soloFecha(p.hoy ?? new Date());
  const finISO = soloFecha(p.fechaFin);
  if (p.progreso < 100 && finISO < hoyISO) return "ATRASADA";
  if (p.progreso >= 100) return "COMPLETADA";
  if (p.progreso > 0) return "EN_CURSO";
  return "NO_INICIADA";
}

// Promedio ponderado por duración — se usa tanto para el avance de una
// categoría (sobre sus tareas) como para el avance global (sobre todas),
// así las dos cifras nunca se desalinean por fórmulas distintas.
export function progresoPonderado(tareas: { duracionDias: number; progreso: number }[]): number {
  const totalDias = tareas.reduce((s, t) => s + t.duracionDias, 0);
  if (totalDias === 0) return 0;
  return Math.round(tareas.reduce((s, t) => s + t.progreso * t.duracionDias, 0) / totalDias);
}
