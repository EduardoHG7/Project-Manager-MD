-- CreateTable
CREATE TABLE "categorias_proyecto" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categorias_proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responsables_proyecto" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "iniciales" TEXT,
    "area" TEXT,
    "usuarioId" TEXT,

    CONSTRAINT "responsables_proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tareas_proyecto" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "responsableId" TEXT,
    "nombre" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "duracionDias" INTEGER NOT NULL DEFAULT 1,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "progreso" INTEGER NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'NO_INICIADA',
    "esHito" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "adjuntos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tareas_proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tareas_proyecto_log" (
    "id" TEXT NOT NULL,
    "tareaId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "campo" TEXT NOT NULL,
    "valorAnterior" TEXT,
    "valorNuevo" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tareas_proyecto_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categorias_proyecto_eventoId_nombre_key" ON "categorias_proyecto"("eventoId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "responsables_proyecto_eventoId_nombre_key" ON "responsables_proyecto"("eventoId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "responsables_proyecto_eventoId_usuarioId_key" ON "responsables_proyecto"("eventoId", "usuarioId");

-- AddForeignKey
ALTER TABLE "categorias_proyecto" ADD CONSTRAINT "categorias_proyecto_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsables_proyecto" ADD CONSTRAINT "responsables_proyecto_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsables_proyecto" ADD CONSTRAINT "responsables_proyecto_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas_proyecto" ADD CONSTRAINT "tareas_proyecto_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas_proyecto" ADD CONSTRAINT "tareas_proyecto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas_proyecto" ADD CONSTRAINT "tareas_proyecto_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "responsables_proyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas_proyecto_log" ADD CONSTRAINT "tareas_proyecto_log_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "tareas_proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas_proyecto_log" ADD CONSTRAINT "tareas_proyecto_log_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

