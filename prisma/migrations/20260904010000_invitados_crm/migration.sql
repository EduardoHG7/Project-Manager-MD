-- CreateTable
CREATE TABLE "etapas_invitado" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "etapas_invitado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitados" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "empresa" TEXT,
    "telefono" TEXT,
    "correo" TEXT,
    "notas" TEXT,
    "etapaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "etapas_invitado_eventoId_nombre_key" ON "etapas_invitado"("eventoId", "nombre");

-- AddForeignKey
ALTER TABLE "etapas_invitado" ADD CONSTRAINT "etapas_invitado_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitados" ADD CONSTRAINT "invitados_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitados" ADD CONSTRAINT "invitados_etapaId_fkey" FOREIGN KEY ("etapaId") REFERENCES "etapas_invitado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

