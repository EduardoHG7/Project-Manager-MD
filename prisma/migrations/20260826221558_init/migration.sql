-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'LECTURA',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "recinto" TEXT,
    "fechaInicio" DATETIME NOT NULL,
    "fechaFin" DATETIME NOT NULL,
    "montajeInicio" DATETIME,
    "montajeFin" DATETIME,
    "desmontajeInicio" DATETIME,
    "desmontajeFin" DATETIME,
    "planoUrl" TEXT,
    "planoAncho" INTEGER NOT NULL DEFAULT 1200,
    "planoAlto" INTEGER NOT NULL DEFAULT 628,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "distribuidores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "proveedores_constructores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT,
    "telefono" TEXT
);

-- CreateTable
CREATE TABLE "espacios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventoId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'AUTOMOTRIZ',
    "fila" TEXT,
    "medidas" TEXT,
    "areaM2" REAL,
    "alturaMaxCm" REAL NOT NULL DEFAULT 550,
    "autosEnPiso" INTEGER,
    "estado" TEXT NOT NULL DEFAULT 'SIN_RENDER',
    "x" REAL,
    "y" REAL,
    "renderUrl" TEXT,
    "distribuidorId" TEXT,
    "proveedorId" TEXT,
    "fabricacionInicio" DATETIME,
    "fabricacionFin" DATETIME,
    "montajeInicio" DATETIME,
    "montajeFin" DATETIME,
    "verificacionInicio" DATETIME,
    "verificacionFin" DATETIME,
    "atrasadoMotivo" TEXT,
    "cargaElectricaKw" REAL,
    "puntosLuz" TEXT,
    "pisoTarima" TEXT,
    "ultimaEntrega" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "espacios_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "espacios_distribuidorId_fkey" FOREIGN KEY ("distribuidorId") REFERENCES "distribuidores" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "espacios_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores_constructores" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "espacio_etapas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "espacioId" TEXT NOT NULL,
    "disciplina" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "detalle" TEXT,
    "fecha" DATETIME,
    "orden" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "espacio_etapas_espacioId_fkey" FOREIGN KEY ("espacioId") REFERENCES "espacios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "versiones_entrega" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "espacioId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "nota" TEXT,
    "autor" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "versiones_entrega_espacioId_fkey" FOREIGN KEY ("espacioId") REFERENCES "espacios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "materiales_especificacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "espacioId" TEXT NOT NULL,
    "elemento" TEXT NOT NULL,
    "material" TEXT,
    "color" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "orden" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "materiales_especificacion_espacioId_fkey" FOREIGN KEY ("espacioId") REFERENCES "espacios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pins" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "espacioId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "elemento" TEXT NOT NULL,
    "nota" TEXT,
    "fixNota" TEXT,
    "resuelto" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "pins_espacioId_fkey" FOREIGN KEY ("espacioId") REFERENCES "espacios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mediciones" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "espacioId" TEXT NOT NULL,
    "pinId" TEXT,
    "titulo" TEXT NOT NULL,
    "especificacion" TEXT NOT NULL,
    "valorEsperado" REAL,
    "valorMedido" REAL,
    "unidad" TEXT NOT NULL DEFAULT 'cm',
    "toleranciaMas" REAL NOT NULL DEFAULT 0,
    "toleranciaMenos" REAL NOT NULL DEFAULT 0,
    "conforme" BOOLEAN,
    "fotos" TEXT NOT NULL DEFAULT '[]',
    "registradoPorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mediciones_espacioId_fkey" FOREIGN KEY ("espacioId") REFERENCES "espacios" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "mediciones_pinId_fkey" FOREIGN KEY ("pinId") REFERENCES "pins" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "mediciones_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "incumplimientos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "espacioId" TEXT NOT NULL,
    "medicionId" TEXT,
    "severidad" TEXT NOT NULL DEFAULT 'MENOR',
    "titulo" TEXT NOT NULL,
    "detalle" TEXT,
    "etapa" TEXT,
    "proveedorId" TEXT,
    "fechaLimite" DATETIME,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTA',
    "cerradoPorId" TEXT,
    "cerradoEn" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "incumplimientos_espacioId_fkey" FOREIGN KEY ("espacioId") REFERENCES "espacios" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "incumplimientos_medicionId_fkey" FOREIGN KEY ("medicionId") REFERENCES "mediciones" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "incumplimientos_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores_constructores" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "incumplimientos_cerradoPorId_fkey" FOREIGN KEY ("cerradoPorId") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "visitas_programadas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "espacioId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "hora" TEXT NOT NULL,
    "tarea" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "asignadoAId" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "visitas_programadas_espacioId_fkey" FOREIGN KEY ("espacioId") REFERENCES "espacios" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "visitas_programadas_asignadoAId_fkey" FOREIGN KEY ("asignadoAId") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
