-- CreateTable
CREATE TABLE "evento_actividades" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "hora" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'REUNION',
    "descripcion" TEXT,
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evento_actividades_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "evento_actividades" ADD CONSTRAINT "evento_actividades_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_actividades" ADD CONSTRAINT "evento_actividades_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

