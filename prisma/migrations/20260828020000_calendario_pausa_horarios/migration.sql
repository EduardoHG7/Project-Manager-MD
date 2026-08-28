-- AlterTable
ALTER TABLE "eventos" ADD COLUMN     "horariosNota" TEXT,
ADD COLUMN     "pausaFin" TIMESTAMP(3),
ADD COLUMN     "pausaInicio" TIMESTAMP(3);
