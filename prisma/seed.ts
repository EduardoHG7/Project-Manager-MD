import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function evaluarConformidad(
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

const ESTADO: Record<string, string> = {
  sr: "SIN_RENDER",
  rev: "EN_REVISION",
  apr: "APROBADO",
  fab: "EN_FABRICACION",
  mon: "MONTADO",
  ver: "VERIFICADO",
};

// [numero, nombre, medidas, estado, distribuidor]
const ROWS: Record<string, [string, string, string, string, string][]> = {
  A: [
    ["37", "JETOUR", "21.5x8", "apr", "Autos Xtra"] as any,
    ["36", "ZEEKR", "21.5x8", "fab", "Grupo Silaba"] as any,
    ["35", "BENTLEY", "21x8", "rev", "Bentley PA"] as any,
    ["34", "MAXUS", "21x8", "sr", "Ricardo Pérez"] as any,
    ["33", "GAC", "15.5x18", "ver", "Autos Xtra"] as any,
    ["32", "CHANGAN", "15.5x18", "mon", "Petrolera"] as any,
    ["31", "JAC", "15.5x18", "fab", "Grupo Q"] as any,
    ["30", "BYD", "15.5x18", "apr", "Motta Motors"] as any,
  ] as any,
  B: [
    ["20", "SUZUKI", "15x20", "fab", "Bahía Motors"],
    ["21", "HONDA", "15x20", "ver", "Grupo Q"],
    ["22", "KIA", "15x20", "rev", "Grupo Silaba"],
    ["23", "ISUZU", "15x20", "apr", "Grupo Silaba"],
    ["24", "JAECOO", "15x20", "sr", "Autos Xtra"],
    ["25", "NISSAN", "15x20", "mon", "Ricardo Pérez"],
    ["26", "TOYOTA", "15x20", "ver", "Ricardo Pérez"],
    ["27", "LEXUS", "15x20", "fab", "Ricardo Pérez"],
    ["28", "JEEP·RAM·FIAT", "15x20", "rev", "Bahía Motors"],
    ["29", "MAZDA", "15x20", "apr", "Motta Motors"],
  ] as any,
  C: [
    ["19", "HYUNDAI", "15x20", "mon", "Bahía Motors"],
    ["18", "MG", "15x20", "fab", "Grupo Q"],
    ["17", "BMW", "15x20", "ver", "Bavarian PA"],
    ["16", "MITSUBISHI", "15x20", "rev", "Motta Motors"],
    ["15", "GEELY", "15x20", "apr", "Autos Xtra"],
    ["14", "FORD", "15x20", "fab", "Grupo Silaba"],
    ["13", "AITO", "15x20", "sr", "Grupo Q"],
    ["12", "AUDI", "15x20", "mon", "Bavarian PA"],
    ["11", "SUBARU", "15x20", "rev", "Motta Motors"],
    ["10", "MERCEDES-BENZ", "15x20", "ver", "Bavarian PA"],
  ] as any,
  D: [
    ["01", "FOTON", "20x11", "apr", "Grupo Q"],
    ["02", "JIM", "20x11", "sr", "Autos Xtra"],
    ["03", "MINI", "15x11", "rev", "Bavarian PA"],
    ["04", "OMODA", "20x11", "fab", "Autos Xtra"],
    ["05", "LAND ROVER", "20x11", "mon", "Bavarian PA"],
    ["06", "PORSCHE", "20x11", "ver", "Bavarian PA"],
    ["07", "INFINITI", "15x11", "apr", "Ricardo Pérez"],
    ["08", "IM", "15x11", "rev", "Grupo Silaba"],
    ["09", "LINCOLN", "15x11", "fab", "Motta Motors"],
  ] as any,
  E: [
    ["38", "ACURA", "12x8", "rev", "Ricardo Pérez"],
    ["39", "SOUEAST", "12x8", "sr", "Autos Xtra"],
    ["1M", "MÓDULO 1", "6x4", "ver", "Ferialta"],
    ["2M", "MÓDULO 2", "6x4", "mon", "Ferialta"],
    ["3M", "MÓDULO 3", "6x4", "apr", "Ferialta"],
    ["4M", "MÓDULO 4", "6x4", "fab", "Ferialta"],
  ] as any,
};

const BANKS: [string, string][] = [
  ["AUTO FÁCIL", "rev"], ["BANESI", "apr"], ["CUBIC RENTING", "ver"], ["BANCO GENERAL", "ver"],
  ["BANCO MERCANTIL", "fab"], ["BANISTMO", "mon"], ["UNIBANK", "rev"], ["BANCO ALIADO", "apr"],
  ["PANAMÁ PACÍFICO", "sr"], ["BANESCO", "ver"], ["GLOBAL BANK", "fab"], ["BANCO DELTA", "rev"],
  ["CREDICORP", "apr"], ["SIMPOL", "sr"], ["CORP. DE CRÉDITO", "mon"], ["METROBANK", "ver"],
  ["PANARENTING", "fab"], ["TOWERBANK", "apr"], ["BANCO LAFISE", "rev"], ["DAVIVIENDA", "ver"],
  ["BCT BANK", "sr"], ["ARINITI", "fab"], ["BAC CREDOMATIC", "mon"],
];

const M2: Record<string, number> = {
  "15x20": 300, "15.5x18": 279, "21.5x8": 172, "21x8": 168,
  "20x11": 220, "15x11": 165, "12x8": 96, "6x4": 24,
};

// coordenadas reales sobre el plano de 1200x628 px, convertidas a % al sembrar
const XY: Record<string, [number, number]> = {
  "37": [441, 143], "36": [547, 143], "35": [639, 143], "34": [736, 143],
  "33": [851, 118], "32": [917, 118], "31": [999, 118], "30": [1080, 118],
  "20": [460, 215], "21": [520, 215], "22": [588, 215], "23": [655, 215], "24": [728, 215],
  "25": [800, 215], "26": [872, 215], "27": [942, 215], "28": [1013, 215], "29": [1084, 215],
  "19": [452, 318], "18": [517, 318], "17": [588, 318], "16": [655, 318], "15": [728, 318],
  "14": [800, 318], "13": [872, 318], "12": [942, 318], "11": [1013, 318], "10": [1084, 318],
  "01": [470, 382], "02": [527, 382], "03": [620, 382], "04": [710, 382], "05": [798, 382],
  "06": [888, 382], "07": [965, 382], "08": [1030, 382], "09": [1085, 382],
  "38": [672, 477], "39": [742, 477],
  "1M": [495, 489], "2M": [551, 489], "3M": [719, 441], "4M": [845, 466],
};

// distribuidor (grupo) -> proveedor constructor de stand
const PROVEEDOR_DE: Record<string, string> = {
  "Grupo Silaba": "LARTI 3D",
  "Ricardo Pérez": "Expo Panamá",
  "Autos Xtra": "Stand Pro",
  "Bavarian PA": "Montajes MB",
  "Grupo Q": "LARTI 3D",
  "Motta Motors": "Stand Pro",
  "Bahía Motors": "Expo Panamá",
  "Bentley PA": "Montajes MB",
  Petrolera: "Ferialta",
  Ferialta: "Ferialta",
};

const PLANO_ANCHO = 1200;
const PLANO_ALTO = 628;

function d(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

async function main() {
  console.log("Sembrando datos de demostración: Panama Motor Show Oct 2026…");

  // ── Usuarios ──────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("MotorShow2026!", 10);
  const [admin, supervisor] = await Promise.all([
    prisma.usuario.upsert({
      where: { email: "eherrera" },
      update: {},
      create: { nombre: "Administrador", email: "eherrera", passwordHash, rol: "ADMIN" },
    }),
    prisma.usuario.upsert({
      where: { email: "supervisor@motorshow.pa" },
      update: {},
      create: { nombre: "Supervisor de obra", email: "supervisor@motorshow.pa", passwordHash, rol: "SUPERVISOR" },
    }),
    prisma.usuario.upsert({
      where: { email: "lectura@motorshow.pa" },
      update: {},
      create: { nombre: "Solo lectura", email: "lectura@motorshow.pa", passwordHash, rol: "LECTURA" },
    }),
  ]);

  // ── Evento ────────────────────────────────────────────────────────
  const eventoExistente = await prisma.evento.findFirst({ where: { nombre: "Panama Motor Show Oct 2026" } });
  const evento =
    eventoExistente ||
    (await prisma.evento.create({
      data: {
        nombre: "Panama Motor Show Oct 2026",
        recinto: "Panama Convention Center",
        fechaInicio: d(2026, 10, 16),
        fechaFin: d(2026, 10, 19),
        montajeInicio: d(2026, 10, 8),
        montajeFin: d(2026, 10, 15),
        desmontajeInicio: d(2026, 10, 20),
        desmontajeFin: d(2026, 10, 21),
        planoUrl: "/plano/plano-general.png",
      },
    }));

  // ── Distribuidores y proveedores ─────────────────────────────────
  const distribuidorNombres = Array.from(new Set(Object.values(ROWS).flat().map((r) => r[4])));
  const distribuidorPorNombre = new Map<string, string>();
  for (const nombre of distribuidorNombres) {
    const dbb = await prisma.distribuidor.upsert({ where: { nombre }, update: {}, create: { nombre } });
    distribuidorPorNombre.set(nombre, dbb.id);
  }

  const proveedorNombres = Array.from(new Set(Object.values(PROVEEDOR_DE)));
  const proveedorPorNombre = new Map<string, string>();
  for (const nombre of proveedorNombres) {
    const p = await prisma.proveedorConstructor.upsert({ where: { nombre }, update: {}, create: { nombre } });
    proveedorPorNombre.set(nombre, p.id);
  }

  // ── Espacios automotrices ────────────────────────────────────────
  const espacioIdPorNumero = new Map<string, string>();
  for (const fila of Object.keys(ROWS)) {
    for (const [numero, nombre, medidas, estadoCorto, distribuidorNombre] of ROWS[fila]) {
      const xy = XY[numero];
      const proveedorNombre = PROVEEDOR_DE[distribuidorNombre];
      const espacio = await prisma.espacio.upsert({
        where: { eventoId_numero: { eventoId: evento.id, numero } },
        update: {},
        create: {
          eventoId: evento.id,
          numero,
          nombre,
          categoria: "AUTOMOTRIZ",
          fila,
          medidas,
          areaM2: M2[medidas] ?? null,
          alturaMaxCm: 550,
          estado: ESTADO[estadoCorto],
          x: xy ? (xy[0] / PLANO_ANCHO) * 100 : null,
          y: xy ? (xy[1] / PLANO_ALTO) * 100 : null,
          distribuidorId: distribuidorPorNombre.get(distribuidorNombre),
          proveedorId: proveedorNombre ? proveedorPorNombre.get(proveedorNombre) : null,
        },
      });
      espacioIdPorNumero.set(numero, espacio.id);
    }
  }

  // ── Módulos financieros (bancos) ──────────────────────────────────
  const ferialtaId = proveedorPorNombre.get("Ferialta")!;
  for (let i = 0; i < BANKS.length; i++) {
    const [nombre, estadoCorto] = BANKS[i];
    const numero = `B${i + 1}`;
    const espacio = await prisma.espacio.upsert({
      where: { eventoId_numero: { eventoId: evento.id, numero } },
      update: {},
      create: {
        eventoId: evento.id,
        numero,
        nombre,
        categoria: "FINANCIERO",
        medidas: "6x4",
        areaM2: 24,
        alturaMaxCm: 400,
        estado: ESTADO[estadoCorto],
        proveedorId: ferialtaId,
      },
    });
    espacioIdPorNumero.set(numero, espacio.id);
  }

  // ── Etapas por disciplina (derivadas del estado; detalle real solo para 22) ──
  const DISCIPLINAS = ["DISENO", "ESTRUCTURA", "GRAFICA", "ELECTRICO"] as const;
  function etapasPorEstado(estado: string) {
    const orden = ["SIN_RENDER", "EN_REVISION", "APROBADO", "EN_FABRICACION", "MONTADO", "VERIFICADO"];
    const nivel = orden.indexOf(estado);
    // Cuantas disciplinas ya deberían estar aprobadas según qué tan avanzado está el espacio
    const aprobadas = Math.max(0, Math.min(4, nivel - 1));
    return DISCIPLINAS.map((disc, i) => ({
      disciplina: disc,
      estado: i < aprobadas ? "APROBADO" : i === aprobadas ? "AHORA" : "PENDIENTE",
    }));
  }

  for (const [numero, id] of espacioIdPorNumero) {
    const espacio = await prisma.espacio.findUniqueOrThrow({ where: { id } });
    for (const [i, e] of etapasPorEstado(espacio.estado).entries()) {
      await prisma.espacioEtapa.upsert({
        where: { espacioId_disciplina: { espacioId: id, disciplina: e.disciplina } },
        update: {},
        create: { espacioId: id, disciplina: e.disciplina, estado: e.estado, orden: i },
      });
    }
  }
  // Override con el detalle real del stand 22 (KIA), tal como lo reportó supervisión
  const idKia = espacioIdPorNumero.get("22")!;
  const fichaKia: [string, string, string][] = [
    ["DISENO", "APROBADO", "Aprobado 12 ago · v2"],
    ["ESTRUCTURA", "APROBADO", "Aprobado 19 ago · v3"],
    ["GRAFICA", "AHORA", "En revisión · v3 desde 22 ago"],
    ["ELECTRICO", "PENDIENTE", "Pendiente de entrega"],
  ];
  for (const [i, [disc, est, detalle]] of fichaKia.entries()) {
    await prisma.espacioEtapa.upsert({
      where: { espacioId_disciplina: { espacioId: idKia, disciplina: disc } },
      update: { estado: est, detalle },
      create: { espacioId: idKia, disciplina: disc, estado: est, detalle, orden: i },
    });
  }

  // ── Ficha completa del stand 22 (KIA) — el caso de referencia ────
  await prisma.espacio.update({
    where: { id: idKia },
    data: {
      alturaMaxCm: 550,
      autosEnPiso: 6,
      cargaElectricaKw: 6.4,
      puntosLuz: "24 spots LED 30 W 4000 K",
      pisoTarima: "Tarima 5 cm + laminado",
      ultimaEntrega: d(2026, 8, 22),
      renderUrl: "/plano/render-kia-22.png",
    },
  });

  const versionesKia: [string, string, string, string][] = [
    ["v3", "En revisión", "Ajuste de gráfica del tótem y nuevo counter CAJA. Falta archivo de impresión a 150 dpi.", "LARTI 3D · A. Mendoza"],
    ["v2", "Cambios solicitados", "Altura del tótem bajó de 6.10 m a 5.00 m. Se pidió corregir pasillo interno a 90 cm mínimo.", "Supervisión · S. Vergara"],
    ["v1", "Rechazado", "Excedía la altura permitida y no declaraba materiales de piso ni carga eléctrica.", "Supervisión · S. Vergara"],
  ];
  for (const [version, estado, nota, autor] of versionesKia) {
    const existe = await prisma.versionEntrega.findFirst({ where: { espacioId: idKia, version } });
    if (!existe) await prisma.versionEntrega.create({ data: { espacioId: idKia, version, estado, nota, autor } });
  }

  const materialesKia: [string, string, string, string][] = [
    ["Estructura portante", "Aluminio Octanorm + MDF 18 mm", "RAL 9010", "CONFORME"],
    ["Muro trasero", "MDF pintado mate", "PANTONE Cool Gray 1 C", "CONFORME"],
    ["Tótem de marca", "Acrílico blanco 10 mm iluminado", "PANTONE Black 6 C", "EN_REVISION"],
    ["Counter CAJA", "Corian blanco + laminado roble", "PANTONE 7527 C", "CONFORME"],
    ["Piso", "Laminado roble natural mate", "—", "NO_CONFORME"],
    ["Gráfica gran formato", "Vinil impreso mate 3M IJ180", "CMYK perfil FOGRA39", "EN_REVISION"],
    ["Vegetación", "Follaje artificial ignífugo", "Verde natural", "NO_CONFORME"],
  ];
  for (const [i, [elemento, material, color, estado]] of materialesKia.entries()) {
    const existe = await prisma.materialEspecificacion.findFirst({ where: { espacioId: idKia, elemento } });
    if (!existe) await prisma.materialEspecificacion.create({ data: { espacioId: idKia, elemento, material, color, estado, orden: i } });
  }

  // ── Pines de comparación (render vs. obra) del stand 22 ──────────
  const pines: { x: number; y: number; elemento: string; nota: string; fix: string; esperado?: number; medido?: number; unidad?: string; tol?: number; especTexto?: string; medidoTexto?: string }[] = [
    {
      x: 62, y: 22, elemento: "Tótem de marca",
      nota: "La altura real del tótem es 468 cm contra 500 cm aprobados. Queda por debajo de la línea de visión acordada y rompe la alineación con los stands 21 y 23.",
      fix: "Rehacer el cabezal del tótem a 500 cm antes del día 4 de montaje. Requiere permiso de trabajo en altura.",
      esperado: 500, medido: 468, unidad: "cm", tol: 1,
    },
    {
      x: 73, y: 34, elemento: "Counter CAJA",
      nota: "El counter mide 214 cm de frente contra 200 cm en planta. Reduce el pasillo interno a 86 cm, bajo el mínimo de 90 cm.",
      fix: "Recortar 14 cm del módulo lateral o mover el counter 14 cm hacia el fondo.",
      esperado: 200, medido: 214, unidad: "cm", tol: 2,
    },
    {
      x: 33, y: 76, elemento: "Piso laminado",
      nota: "El acabado instalado es roble brillante; el render y la especificación indican roble natural mate. Genera reflejo sobre los vehículos en fotos de prensa.",
      fix: "Sustituir por laminado mate en el 100% del área o presentar muestra alterna para aprobación.",
      especTexto: "Roble natural mate", medidoTexto: "Roble brillante",
    },
    {
      x: 20, y: 30, elemento: "Logo frontal KIA",
      nota: "Logo instalado a 180 cm de ancho, exactamente como el render aprobado. Conforme.",
      fix: "",
      esperado: 180, medido: 180, unidad: "cm", tol: 0,
    },
    {
      x: 56, y: 48, elemento: "Vegetación lateral",
      nota: "Los dos paneles verdes del render no fueron instalados. El proveedor indica que llegan el día 4.",
      fix: "Confirmar entrega antes del cierre de montaje o retirar del render de prensa.",
      especTexto: "2 paneles verdes", medidoTexto: "No instalado",
    },
  ];

  for (const p of pines) {
    let pin = await prisma.pin.findFirst({ where: { espacioId: idKia, elemento: p.elemento } });
    if (!pin) {
      const count = await prisma.pin.count({ where: { espacioId: idKia } });
      pin = await prisma.pin.create({
        data: { espacioId: idKia, numero: count + 1, x: p.x, y: p.y, elemento: p.elemento, nota: p.nota, fixNota: p.fix || null },
      });
    }

    const yaTieneMedicion = await prisma.medicion.findFirst({ where: { pinId: pin.id } });
    if (yaTieneMedicion) continue;

    if (p.esperado != null && p.medido != null) {
      const conforme = evaluarConformidad(p.esperado, p.medido, p.tol ?? 0, p.tol ?? 0);
      const medicion = await prisma.medicion.create({
        data: {
          espacioId: idKia,
          pinId: pin.id,
          titulo: p.elemento,
          especificacion: `${p.esperado} ${p.unidad}`,
          valorEsperado: p.esperado,
          valorMedido: p.medido,
          unidad: p.unidad || "cm",
          toleranciaMas: p.tol ?? 0,
          toleranciaMenos: p.tol ?? 0,
          conforme,
          fotos: "[]",
          registradoPorId: supervisor.id,
        },
      });
      if (conforme === false) {
        await crearIncumplimientoDesdeMedicion(medicion.id, idKia);
      }
    } else if (p.especTexto) {
      const medicion = await prisma.medicion.create({
        data: {
          espacioId: idKia,
          pinId: pin.id,
          titulo: p.elemento,
          especificacion: p.especTexto,
          unidad: "",
          conforme: false,
          fotos: "[]",
          registradoPorId: supervisor.id,
        },
      });
      await crearIncumplimientoDesdeMedicion(medicion.id, idKia, `Medido "${p.medidoTexto}" contra "${p.especTexto}" aprobado.`);
    }
  }

  async function crearIncumplimientoDesdeMedicion(medicionId: string, espacioId: string, detalleOverride?: string) {
    const medicion = await prisma.medicion.findUniqueOrThrow({ where: { id: medicionId } });
    const espacio = await prisma.espacio.findUniqueOrThrow({ where: { id: espacioId } });
    let severidad = "MENOR";
    if (medicion.valorEsperado != null && medicion.valorMedido != null) {
      const fueraPor =
        medicion.valorMedido > medicion.valorEsperado
          ? medicion.valorMedido - (medicion.valorEsperado + medicion.toleranciaMas)
          : medicion.valorEsperado - medicion.toleranciaMenos - medicion.valorMedido;
      const pct = Math.abs(fueraPor) / Math.abs(medicion.valorEsperado || 1);
      severidad = pct > 0.05 ? "CRITICA" : pct > 0.02 ? "MAYOR" : "MENOR";
    }
    const detalle =
      detalleOverride ||
      `Medido ${medicion.valorMedido} ${medicion.unidad} contra ${medicion.valorEsperado} ${medicion.unidad} aprobado.`;
    await prisma.incumplimiento.create({
      data: {
        espacioId,
        medicionId,
        severidad,
        titulo: medicion.titulo,
        detalle,
        etapa: "Estructura",
        proveedorId: espacio.proveedorId,
        estado: "ABIERTA",
        fechaLimite: d(2026, 10, 15),
      },
    });
  }

  // ── Incumplimientos adicionales, ya reportados en otros espacios ──
  const incumplimientosExtra: { numero: string; severidad: string; titulo: string; detalle: string; etapa: string; due: Date; estado: string }[] = [
    {
      numero: "31",
      severidad: "CRITICA",
      titulo: "Estructura excede altura permitida",
      detalle: "6.05 m contra 5.50 m de norma del recinto. Requiere rediseño de cabezal.",
      etapa: "Estructura",
      due: d(2026, 10, 14),
      estado: "ABIERTA",
    },
    {
      numero: "17",
      severidad: "MAYOR",
      titulo: "Piso instalado en acabado brillante",
      detalle: "Especificación indica mate. Genera reflejo en fotografía de prensa.",
      etapa: "Gráfica",
      due: d(2026, 10, 15),
      estado: "EN_CORRECCION",
    },
    {
      numero: "05",
      severidad: "MAYOR",
      titulo: "Pantone de muro fuera de marca",
      detalle: "Instalado PANTONE 431 C contra 425 C aprobado.",
      etapa: "Gráfica",
      due: d(2026, 10, 15),
      estado: "ABIERTA",
    },
    {
      numero: "12",
      severidad: "MENOR",
      titulo: "Vegetación lateral no instalada",
      detalle: "2 paneles verdes del render pendientes de llegada.",
      etapa: "Diseño",
      due: d(2026, 10, 15),
      estado: "ABIERTA",
    },
    {
      numero: "26",
      severidad: "MENOR",
      titulo: "Spots a 3000 K en lugar de 4000 K",
      detalle: "Sustituidos el 13 oct, verificado con foto y medición.",
      etapa: "Eléctrico",
      due: d(2026, 10, 13),
      estado: "CERRADA",
    },
    {
      numero: "34",
      severidad: "CRITICA",
      titulo: "No ha entregado render inicial",
      detalle: "Vencido hace 3 días. Bloquea el inicio de fabricación.",
      etapa: "Diseño",
      due: d(2026, 9, 20),
      estado: "ABIERTA",
    },
    {
      numero: "13",
      severidad: "MAYOR",
      titulo: "No ha entregado planta acotada",
      detalle: "Vencido hace 1 día.",
      etapa: "Diseño",
      due: d(2026, 9, 22),
      estado: "ABIERTA",
    },
    {
      numero: "08",
      severidad: "MENOR",
      titulo: "Carga eléctrica sin memoria de cálculo",
      detalle: "Falta documento técnico del circuito.",
      etapa: "Eléctrico",
      due: d(2026, 9, 25),
      estado: "ABIERTA",
    },
    {
      numero: "02",
      severidad: "MENOR",
      titulo: "Sin proveedor de fabricación asignado",
      detalle: "El distribuidor aún no confirma constructor de stand.",
      etapa: "Diseño",
      due: d(2026, 9, 26),
      estado: "ABIERTA",
    },
  ];

  for (const item of incumplimientosExtra) {
    const espacioId = espacioIdPorNumero.get(item.numero);
    if (!espacioId) continue;
    const existe = await prisma.incumplimiento.findFirst({ where: { espacioId, titulo: item.titulo } });
    if (existe) continue;
    const espacio = await prisma.espacio.findUniqueOrThrow({ where: { id: espacioId } });
    await prisma.incumplimiento.create({
      data: {
        espacioId,
        severidad: item.severidad,
        titulo: item.titulo,
        detalle: item.detalle,
        etapa: item.etapa,
        proveedorId: espacio.proveedorId,
        fechaLimite: item.due,
        estado: item.estado,
        cerradoEn: item.estado === "CERRADA" ? d(2026, 10, 13) : null,
      },
    });
  }

  // ── Calendario: fechas reales de fabricación/montaje/verificación ─
  const gantt: { numero: string; fab?: [number, number]; mon?: [number, number]; ver?: [number, number]; late?: [number, number]; motivo?: string }[] = [
    { numero: "22", fab: [0, 4], mon: [4, 4], ver: [8, 1] },
    { numero: "26", fab: [0, 3], mon: [3, 4], ver: [7, 1] },
    { numero: "17", fab: [0, 3], mon: [3, 3], late: [6, 2], motivo: "Desviación abierta" },
    { numero: "34", late: [0, 5], fab: [5, 4], motivo: "Sin render aprobado" },
    { numero: "13", late: [0, 4], fab: [4, 4], motivo: "Sin planta acotada" },
    { numero: "31", fab: [0, 4], late: [4, 3], motivo: "Altura fuera de norma" },
    { numero: "05", fab: [1, 3], mon: [4, 4] },
    { numero: "30", fab: [0, 4], mon: [4, 5] },
    { numero: "10", fab: [0, 3], mon: [3, 4], ver: [7, 1] },
  ];
  const inicioCalendario = evento.montajeInicio!;
  const addDias = (base: Date, n: number) => {
    const x = new Date(base);
    x.setUTCDate(x.getUTCDate() + n);
    return x;
  };

  for (const g of gantt) {
    const espacioId = espacioIdPorNumero.get(g.numero);
    if (!espacioId) continue;
    const data: Record<string, any> = {};
    if (g.fab) {
      data.fabricacionInicio = addDias(inicioCalendario, g.fab[0]);
      data.fabricacionFin = addDias(inicioCalendario, g.fab[0] + g.fab[1]);
    }
    if (g.mon) {
      data.montajeInicio = addDias(inicioCalendario, g.mon[0]);
      data.montajeFin = addDias(inicioCalendario, g.mon[0] + g.mon[1]);
    }
    if (g.ver) {
      data.verificacionInicio = addDias(inicioCalendario, g.ver[0]);
      data.verificacionFin = addDias(inicioCalendario, g.ver[0] + g.ver[1]);
    }
    if (g.motivo) data.atrasadoMotivo = g.motivo;
    await prisma.espacio.update({ where: { id: espacioId }, data });
  }

  // ── Ruta de inspección de hoy (pantalla Obra) ─────────────────────
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const rutaHoy: [string, string, string, string][] = [
    ["08:30", "26", "Verificación final", "CERRADO"],
    ["09:15", "22", "Estructura + gráfica", "EN_CURSO"],
    ["10:30", "17", "Cierre de desviación", "EN_CURSO"],
    ["11:45", "05", "Medición de tótem", "PENDIENTE"],
    ["13:30", "12", "Pantones e iluminación", "PENDIENTE"],
    ["15:00", "31", "Altura de estructura", "PENDIENTE"],
  ];
  const yaHayVisitasHoy = await prisma.visitaProgramada.findFirst({ where: { fecha: hoy } });
  if (!yaHayVisitasHoy) {
    for (const [i, [hora, numero, tarea, estado]] of rutaHoy.entries()) {
      const espacioId = espacioIdPorNumero.get(numero);
      if (!espacioId) continue;
      await prisma.visitaProgramada.create({
        data: { espacioId, fecha: hoy, hora, tarea, estado, orden: i, asignadoAId: supervisor.id },
      });
    }
  }

  console.log("Listo. Usuarios de acceso:");
  console.log("  eherrera                / MotorShow2026!  (ADMIN)");
  console.log("  supervisor@motorshow.pa / MotorShow2026!  (SUPERVISOR)");
  console.log("  lectura@motorshow.pa    / MotorShow2026!  (LECTURA)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
