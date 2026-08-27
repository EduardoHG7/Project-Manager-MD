import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Borra todos los datos de ejemplo del seed (mediciones, incumplimientos,
 * pines, materiales, versiones, etapas, visitas) y regresa cada espacio a
 * "Sin render" sin fechas de fabricación/montaje/verificación — el punto
 * de partida real: nada entregado todavía. No toca eventos, espacios
 * (número/nombre/medidas/plano), distribuidores, proveedores ni usuarios.
 */
async function main() {
  console.log("Reseteando a estado inicial: nada entregado aún…");

  await prisma.incumplimiento.deleteMany({});
  await prisma.medicion.deleteMany({});
  await prisma.pin.deleteMany({});
  await prisma.materialEspecificacion.deleteMany({});
  await prisma.versionEntrega.deleteMany({});
  await prisma.espacioEtapa.deleteMany({});
  await prisma.visitaProgramada.deleteMany({});

  const { count } = await prisma.espacio.updateMany({
    data: {
      estado: "SIN_RENDER",
      fabricacionInicio: null,
      fabricacionFin: null,
      montajeInicio: null,
      montajeFin: null,
      verificacionInicio: null,
      verificacionFin: null,
      atrasadoMotivo: null,
      ultimaEntrega: null,
    },
  });

  console.log(`Listo. ${count} espacios en "Sin render", sin progreso ni incumplimientos de ejemplo.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
