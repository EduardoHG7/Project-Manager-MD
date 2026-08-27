-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'LECTURA',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "recinto" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "montajeInicio" TIMESTAMP(3),
    "montajeFin" TIMESTAMP(3),
    "desmontajeInicio" TIMESTAMP(3),
    "desmontajeFin" TIMESTAMP(3),
    "planoUrl" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribuidores" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "distribuidores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedores_constructores" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT,
    "telefono" TEXT,

    CONSTRAINT "proveedores_constructores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "espacios" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'AUTOMOTRIZ',
    "fila" TEXT,
    "medidas" TEXT,
    "areaM2" DOUBLE PRECISION,
    "alturaMaxCm" DOUBLE PRECISION NOT NULL DEFAULT 550,
    "autosEnPiso" INTEGER,
    "estado" TEXT NOT NULL DEFAULT 'SIN_RENDER',
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "renderUrl" TEXT,
    "distribuidorId" TEXT,
    "proveedorId" TEXT,
    "fabricacionInicio" TIMESTAMP(3),
    "fabricacionFin" TIMESTAMP(3),
    "montajeInicio" TIMESTAMP(3),
    "montajeFin" TIMESTAMP(3),
    "verificacionInicio" TIMESTAMP(3),
    "verificacionFin" TIMESTAMP(3),
    "atrasadoMotivo" TEXT,
    "cargaElectricaKw" DOUBLE PRECISION,
    "puntosLuz" TEXT,
    "pisoTarima" TEXT,
    "ultimaEntrega" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "espacios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "espacio_etapas" (
    "id" TEXT NOT NULL,
    "espacioId" TEXT NOT NULL,
    "disciplina" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "detalle" TEXT,
    "fecha" TIMESTAMP(3),
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "espacio_etapas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "versiones_entrega" (
    "id" TEXT NOT NULL,
    "espacioId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "nota" TEXT,
    "autor" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "versiones_entrega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiales_especificacion" (
    "id" TEXT NOT NULL,
    "espacioId" TEXT NOT NULL,
    "elemento" TEXT NOT NULL,
    "material" TEXT,
    "color" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "materiales_especificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pins" (
    "id" TEXT NOT NULL,
    "espacioId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "elemento" TEXT NOT NULL,
    "nota" TEXT,
    "fixNota" TEXT,
    "resuelto" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "pins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mediciones" (
    "id" TEXT NOT NULL,
    "espacioId" TEXT NOT NULL,
    "pinId" TEXT,
    "titulo" TEXT NOT NULL,
    "especificacion" TEXT NOT NULL,
    "valorEsperado" DOUBLE PRECISION,
    "valorMedido" DOUBLE PRECISION,
    "unidad" TEXT NOT NULL DEFAULT 'cm',
    "toleranciaMas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "toleranciaMenos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conforme" BOOLEAN,
    "fotos" TEXT NOT NULL DEFAULT '[]',
    "registradoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mediciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incumplimientos" (
    "id" TEXT NOT NULL,
    "espacioId" TEXT NOT NULL,
    "medicionId" TEXT,
    "severidad" TEXT NOT NULL DEFAULT 'MENOR',
    "titulo" TEXT NOT NULL,
    "detalle" TEXT,
    "etapa" TEXT,
    "proveedorId" TEXT,
    "fechaLimite" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'ABIERTA',
    "cerradoPorId" TEXT,
    "cerradoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incumplimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitas_programadas" (
    "id" TEXT NOT NULL,
    "espacioId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "hora" TEXT NOT NULL,
    "tarea" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "asignadoAId" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "visitas_programadas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "distribuidores_nombre_key" ON "distribuidores"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "proveedores_constructores_nombre_key" ON "proveedores_constructores"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "espacios_eventoId_numero_key" ON "espacios"("eventoId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "espacio_etapas_espacioId_disciplina_key" ON "espacio_etapas"("espacioId", "disciplina");

-- CreateIndex
CREATE UNIQUE INDEX "incumplimientos_medicionId_key" ON "incumplimientos"("medicionId");

-- AddForeignKey
ALTER TABLE "espacios" ADD CONSTRAINT "espacios_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "espacios" ADD CONSTRAINT "espacios_distribuidorId_fkey" FOREIGN KEY ("distribuidorId") REFERENCES "distribuidores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "espacios" ADD CONSTRAINT "espacios_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores_constructores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "espacio_etapas" ADD CONSTRAINT "espacio_etapas_espacioId_fkey" FOREIGN KEY ("espacioId") REFERENCES "espacios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versiones_entrega" ADD CONSTRAINT "versiones_entrega_espacioId_fkey" FOREIGN KEY ("espacioId") REFERENCES "espacios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiales_especificacion" ADD CONSTRAINT "materiales_especificacion_espacioId_fkey" FOREIGN KEY ("espacioId") REFERENCES "espacios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pins" ADD CONSTRAINT "pins_espacioId_fkey" FOREIGN KEY ("espacioId") REFERENCES "espacios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mediciones" ADD CONSTRAINT "mediciones_espacioId_fkey" FOREIGN KEY ("espacioId") REFERENCES "espacios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mediciones" ADD CONSTRAINT "mediciones_pinId_fkey" FOREIGN KEY ("pinId") REFERENCES "pins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mediciones" ADD CONSTRAINT "mediciones_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incumplimientos" ADD CONSTRAINT "incumplimientos_espacioId_fkey" FOREIGN KEY ("espacioId") REFERENCES "espacios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incumplimientos" ADD CONSTRAINT "incumplimientos_medicionId_fkey" FOREIGN KEY ("medicionId") REFERENCES "mediciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incumplimientos" ADD CONSTRAINT "incumplimientos_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores_constructores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incumplimientos" ADD CONSTRAINT "incumplimientos_cerradoPorId_fkey" FOREIGN KEY ("cerradoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas_programadas" ADD CONSTRAINT "visitas_programadas_espacioId_fkey" FOREIGN KEY ("espacioId") REFERENCES "espacios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas_programadas" ADD CONSTRAINT "visitas_programadas_asignadoAId_fkey" FOREIGN KEY ("asignadoAId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

