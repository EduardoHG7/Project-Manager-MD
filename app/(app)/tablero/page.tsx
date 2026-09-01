import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEventoSeleccionado } from "@/lib/evento";
import { ESTADOS, ESTADO_LABEL, ESTADO_FILL, SEVERIDAD_PILL, SEVERIDAD_LABEL, fmtFecha } from "@/lib/estados";
import { SinEvento } from "../_shared/SinEvento";
import { SupervisoresPanel } from "./SupervisoresPanel";
import { RiggingPanel } from "./RiggingPanel";

export const dynamic = "force-dynamic";

const DISCIPLINAS = ["DISENO", "ESTRUCTURA", "GRAFICA", "ELECTRICO"] as const;
const DISCIPLINA_LABEL: Record<string, string> = {
  DISENO: "Diseño",
  ESTRUCTURA: "Estructura",
  GRAFICA: "Gráfica",
  ELECTRICO: "Eléctrico",
};

export default async function TableroPage() {
  const evento = await getEventoSeleccionado();
  if (!evento) {
    const session = await getServerSession(authOptions);
    return <SinEvento esAdmin={session?.user.rol === "ADMIN"} />;
  }

  const espacios = await prisma.espacio.findMany({
    where: { eventoId: evento.id },
    include: { distribuidor: true, etapas: true },
  });
  const total = espacios.length;

  const counts: Record<string, number> = {};
  for (const e of ESTADOS) counts[e] = 0;
  espacios.forEach((e) => (counts[e.estado] = (counts[e.estado] || 0) + 1));

  const incumplimientosAbiertos = await prisma.incumplimiento.findMany({
    where: { espacio: { eventoId: evento.id }, estado: { not: "CERRADA" } },
    include: { espacio: true },
    orderBy: [{ severidad: "asc" }, { fechaLimite: "asc" }],
    take: 6,
  });

  const stageProgress = DISCIPLINAS.map((d) => {
    const done = espacios.filter((e) => e.etapas.some((et) => et.disciplina === d && et.estado === "APROBADO")).length;
    return { disciplina: d, done, total };
  });

  const porDistribuidor = new Map<string, { nombre: string; stands: number; espacioIds: string[] }>();
  for (const e of espacios) {
    const nombre = e.distribuidor?.nombre || "Sin asignar";
    const key = e.distribuidorId || "sin-asignar";
    if (!porDistribuidor.has(key)) porDistribuidor.set(key, { nombre, stands: 0, espacioIds: [] });
    const entry = porDistribuidor.get(key)!;
    entry.stands++;
    entry.espacioIds.push(e.id);
  }

  const supervisoresDb = await prisma.usuario.findMany({
    where: { rol: "SUPERVISOR", activo: true },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });
  const espaciosPorSupervisor = new Map<string, { numero: string; nombre: string }[]>();
  for (const e of espacios) {
    if (!e.supervisorId) continue;
    if (!espaciosPorSupervisor.has(e.supervisorId)) espaciosPorSupervisor.set(e.supervisorId, []);
    espaciosPorSupervisor.get(e.supervisorId)!.push({ numero: e.numero, nombre: e.nombre });
  }
  const supervisores = supervisoresDb.map((s) => ({
    id: s.id,
    nombre: s.nombre,
    stands: espaciosPorSupervisor.get(s.id) || [],
  }));
  const sinSupervisor = espacios.filter((e) => !e.supervisorId).map((e) => ({ numero: e.numero, nombre: e.nombre }));

  const standsConRigging = espacios
    .filter((e) => e.usaRigging === true)
    .map((e) => ({ numero: e.numero, nombre: e.nombre }));

  const todosIncump = await prisma.incumplimiento.findMany({
    where: { espacio: { eventoId: evento.id }, estado: { not: "CERRADA" } },
    select: { espacioId: true, fechaLimite: true },
  });
  const hoy = new Date();
  const vendors = Array.from(porDistribuidor.values())
    .map((v) => ({
      ...v,
      dev: todosIncump.filter((i) => v.espacioIds.includes(i.espacioId)).length,
      late: todosIncump.filter((i) => v.espacioIds.includes(i.espacioId) && i.fechaLimite && i.fechaLimite < hoy).length,
    }))
    .sort((a, b) => b.stands - a.stands);

  return (
    <main className="page">
      <h1>{total} espacios bajo supervisión</h1>
      <p className="text-muted" style={{ maxWidth: "62ch" }}>
        {evento.nombre} · {evento.recinto}
      </p>

      <div className="kpi-row" style={{ gridTemplateColumns: `repeat(${ESTADOS.length}, 1fr)`, marginTop: 20 }}>
        {ESTADOS.map((k) => (
          <Link key={k} href="/mapa" className="kpi" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="text-muted" style={{ fontSize: 12 }}>
              {ESTADO_LABEL[k]}
            </span>
            <span className="kpi-n">{counts[k]}</span>
            <span className="text-muted" style={{ fontSize: 11 }}>
              {total ? Math.round((counts[k] / total) * 100) : 0}%
            </span>
            <span className={`kpi-bar ${ESTADO_FILL[k]}`} style={{ width: `${total ? (counts[k] / total) * 100 : 0}%` }} />
          </Link>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)", gap: 32, marginTop: 32 }}>
        <section>
          <h6 className="text-muted">Incumplimientos abiertos que requieren atención</h6>
          <div className="table-wrap">
            <table className="table">
              <tbody>
                {incumplimientosAbiertos.length === 0 && (
                  <tr>
                    <td className="text-muted">No hay incumplimientos abiertos. Buen trabajo.</td>
                  </tr>
                )}
                {incumplimientosAbiertos.map((i) => (
                  <tr key={i.id}>
                    <td style={{ fontWeight: 700 }}>{i.espacio.numero}</td>
                    <td>{i.espacio.nombre}</td>
                    <td>{i.titulo}</td>
                    <td>
                      <span className={`pill ${SEVERIDAD_PILL[i.severidad]}`}>{SEVERIDAD_LABEL[i.severidad]}</span>
                    </td>
                    <td className="text-muted">{fmtFecha(i.fechaLimite)}</td>
                    <td>
                      <Link href={`/espacios/${encodeURIComponent(i.espacio.numero)}`} className="btn-ghost">
                        Ver ficha →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href="/incumplimientos" className="btn btn-secondary" style={{ marginTop: 14 }}>
            Ver todos los incumplimientos
          </Link>

          <h6 className="text-muted" style={{ marginTop: 32 }}>
            Progreso por disciplina
          </h6>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {stageProgress.map((s) => (
              <div key={s.disciplina}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <strong>{DISCIPLINA_LABEL[s.disciplina]}</strong>
                  <span className="text-muted">
                    {s.done} / {s.total} aprobados
                  </span>
                </div>
                <div style={{ position: "relative", height: 8, background: "var(--color-neutral-200)" }}>
                  <div
                    style={{
                      position: "absolute",
                      inset: "0 auto 0 0",
                      width: `${s.total ? (s.done / s.total) * 100 : 0}%`,
                      background: "var(--color-neutral-900)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <h6 className="text-muted" style={{ marginTop: 32 }}>
            Supervisores
          </h6>
          <SupervisoresPanel supervisores={supervisores} sinAsignar={sinSupervisor} />

          <h6 className="text-muted" style={{ marginTop: 32 }}>
            Rigging
          </h6>
          <RiggingPanel stands={standsConRigging} />
        </section>

        <section>
          <h6 className="text-muted">Proveedores / grupos representantes</h6>
          <table className="table">
            <thead>
              <tr>
                <th>Grupo</th>
                <th>Stands</th>
                <th>Atrasados</th>
                <th style={{ textAlign: "right" }}>Desviaciones</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.nombre}>
                  <td>{v.nombre}</td>
                  <td>{v.stands}</td>
                  <td>{v.late}</td>
                  <td style={{ textAlign: "right", fontWeight: 800, color: v.dev ? "var(--color-accent)" : "inherit" }}>
                    {v.dev}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Link href="/directorio" className="btn btn-secondary" style={{ marginTop: 14 }}>
            Ver directorio →
          </Link>
        </section>
      </div>
    </main>
  );
}
