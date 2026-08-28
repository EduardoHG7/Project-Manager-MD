-- CreateTable
CREATE TABLE "comentarios_espacio" (
    "id" TEXT NOT NULL,
    "espacioId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "autorId" TEXT,
    "autor" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comentarios_espacio_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "comentarios_espacio" ADD CONSTRAINT "comentarios_espacio_espacioId_fkey" FOREIGN KEY ("espacioId") REFERENCES "espacios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios_espacio" ADD CONSTRAINT "comentarios_espacio_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
