-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "espacioId" TEXT;

-- AlterTable
ALTER TABLE "versiones_entrega" ADD COLUMN     "comentario" TEXT,
ADD COLUMN     "mapaUrl" TEXT,
ADD COLUMN     "renderUrl" TEXT,
ADD COLUMN     "revisadoEn" TIMESTAMP(3),
ADD COLUMN     "revisadoPorId" TEXT,
ADD COLUMN     "subidoPorId" TEXT,
ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE';

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_espacioId_key" ON "usuarios"("espacioId");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_espacioId_fkey" FOREIGN KEY ("espacioId") REFERENCES "espacios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versiones_entrega" ADD CONSTRAINT "versiones_entrega_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versiones_entrega" ADD CONSTRAINT "versiones_entrega_revisadoPorId_fkey" FOREIGN KEY ("revisadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

