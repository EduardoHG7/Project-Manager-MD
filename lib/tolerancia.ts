import { prisma } from "@/lib/db";

/**
 * Una medición está conforme si cae dentro de [esperado - toleranciaMenos, esperado + toleranciaMas].
 * Sin valor esperado no hay forma de evaluar conformidad (queda null = "por revisar").
 */
export function evaluarConformidad(
  valorEsperado: number | null,
  valorMedido: number | null,
  toleranciaMas: number,
  toleranciaMenos: number
): boolean | null {
  if (valorEsperado == null || valorMedido == null) return null;
  const min = valorEsperado - toleranciaMenos;
  const max = valorEsperado + toleranciaMas;
  return valorMedido >= min && valorMedido <= max;
}

function severidadPorDesvio(valorEsperado: number, valorMedido: number, toleranciaMas: number, toleranciaMenos: number) {
  const delta = valorMedido > valorEsperado ? valorMedido - (valorEsperado + toleranciaMas) : (valorEsperado - toleranciaMenos) - valorMedido;
  const pctBase = Math.abs(valorEsperado) > 0 ? delta / Math.abs(valorEsperado) : 1;
  if (pctBase > 0.05) return "CRITICA";
  if (pctBase > 0.02) return "MAYOR";
  return "MENOR";
}

/**
 * Tras guardar una medición, si no es conforme y todavía no tiene un
 * incumplimiento asociado, crea uno automáticamente — así el equipo de obra
 * nunca tiene que "recordar" abrir el reporte, la propia medición lo dispara.
 */
export async function generarIncumplimientoSiAplica(medicionId: string) {
  const medicion = await prisma.medicion.findUnique({
    where: { id: medicionId },
    include: { espacio: true, incumplimiento: true },
  });
  if (!medicion || medicion.incumplimiento) return null;
  if (medicion.conforme !== false) return null;

  const severidad =
    medicion.valorEsperado != null && medicion.valorMedido != null
      ? severidadPorDesvio(medicion.valorEsperado, medicion.valorMedido, medicion.toleranciaMas, medicion.toleranciaMenos)
      : "MENOR";

  const delta =
    medicion.valorEsperado != null && medicion.valorMedido != null
      ? medicion.valorMedido - medicion.valorEsperado
      : null;

  const detalle =
    medicion.valorEsperado != null && medicion.valorMedido != null
      ? `Medido ${medicion.valorMedido} ${medicion.unidad} contra ${medicion.valorEsperado} ${medicion.unidad} aprobado (${delta! > 0 ? "+" : ""}${delta} ${medicion.unidad}).`
      : `"${medicion.titulo}" registrado como no conforme.`;

  return prisma.incumplimiento.create({
    data: {
      espacioId: medicion.espacioId,
      medicionId: medicion.id,
      severidad,
      titulo: medicion.titulo,
      detalle,
      proveedorId: medicion.espacio.proveedorId,
      estado: "ABIERTA",
    },
  });
}
