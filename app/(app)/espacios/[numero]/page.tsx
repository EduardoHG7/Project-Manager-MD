import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEventoSeleccionado } from "@/lib/evento";
import { ESTADO_LABEL, ESTADO_PILL, VERSION_ESTADO_LABEL, VERSION_ESTADO_PILL, esPdf, fmtFecha, fmtFechaHora } from "@/lib/estados";
import { GaleriaArchivos } from "@/components/GaleriaArchivos";
import { ComentariosEspacio } from "./ComentariosEspacio";
import { ContactoEspacio } from "./ContactoEspacio";
import { EspecificacionesEspacio } from "./EspecificacionesEspacio";
import { SupervisorAsignado } from "./SupervisorAsignado";
import { EstadoSelector } from "./EstadoSelector";
import { EtapasEditor } from "./EtapasEditor";
import { MaterialesEditor } from "./MaterialesEditor";
import { SubirVersionStaffForm } from "./SubirVersionStaffForm";

function toISODate(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

export const dynamic = "force-dynamic";

function Archivo({ url, alt }: { url: string; alt: string }) {
  if (esPdf(url)) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="text-muted" style={{ fontSize: 12 }}>
        📄 Ver {alt} (PDF)
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt} style={{ width: 110, height: 80, objectFit: "cover", border: "1px solid var(--color-divider)" }} />
    </a>
  );
}

export default async function FichaStandPage({ params }: { params: { numero: string } }) {
  const evento = await getEventoSeleccionado();
  if (!evento) notFound();
  const session = await getServerSession(authOptions);
  const canEdit = session?.user.rol === "ADMIN" || session?.user.rol === "SUPERVISOR";

  const espacio = await prisma.espacio.findUnique({
    where: { eventoId_numero: { eventoId: evento.id, numero: params.numero } },
    include: {
      distribuidor: true,
      proveedor: true,
      etapas: { orderBy: { orden: "asc" } },
      versiones: { orderBy: { fecha: "desc" }, include: { subidoPor: true, revisadoPor: true } },
      materiales: { orderBy: { orden: "asc" } },
      pins: true,
      incumplimientos: { where: { estado: { not: "CERRADA" } } },
      comentarios: { orderBy: { fecha: "desc" } },
      supervisor: true,
    },
  });
  if (!espacio) notFound();

  const [proveedores, distribuidores, supervisores] = canEdit
    ? await Promise.all([
        prisma.proveedorConstructor.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
        prisma.distribuidor.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
        prisma.usuario.findMany({
          where: { rol: "SUPERVISOR", activo: true },
          orderBy: { nombre: "asc" },
          select: { id: true, nombre: true },
        }),
      ])
    : [[], [], []];

  return (
    <main className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h6 className="text-muted">
            Espacio {espacio.numero} · {espacio.fila ? `Hall ${espacio.fila}` : espacio.categoria}
          </h6>
          <h2 style={{ margin: 0 }}>{espacio.nombre}</h2>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className={`pill ${espacio.incumplimientos.length ? "pill-red" : ESTADO_PILL[espacio.estado]}`}>
            {espacio.incumplimientos.length ? "Desviación abierta" : ESTADO_LABEL[espacio.estado]}
          </span>
          {canEdit && <EstadoSelector espacioId={espacio.id} estadoActual={espacio.estado} />}
          <Link href={`/espacios/${encodeURIComponent(espacio.numero)}/comparar`} className="btn btn-secondary">
            Comparar render vs. obra
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 32, marginTop: 24 }}>
        <section>
          {espacio.versiones[0] && (espacio.versiones[0].renderUrls.length > 0 || espacio.versiones[0].mapaUrl) && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h6 className="text-muted">
                  Render actual · {espacio.versiones[0].version}
                </h6>
                <span className={`pill ${VERSION_ESTADO_PILL[espacio.versiones[0].estado]}`}>
                  {VERSION_ESTADO_LABEL[espacio.versiones[0].estado] || espacio.versiones[0].estado}
                </span>
              </div>
              <GaleriaArchivos renderUrls={espacio.versiones[0].renderUrls} mapaUrl={espacio.versiones[0].mapaUrl} />
            </>
          )}

          <h6 className="text-muted" style={{ marginTop: 28 }}>Progreso por disciplina</h6>
          <EtapasEditor espacioId={espacio.id} etapas={espacio.etapas} canEdit={canEdit} />

          <h6 className="text-muted" style={{ marginTop: 28 }}>
            Materiales y acabados
          </h6>
          <MaterialesEditor espacioId={espacio.id} materiales={espacio.materiales} canEdit={canEdit} />

          <h6 className="text-muted" style={{ marginTop: 28 }}>
            Historial de versiones
          </h6>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {espacio.versiones.length === 0 && <p className="text-muted">Aún no hay versiones registradas.</p>}
            {espacio.versiones.map((v) => (
              <div key={v.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>{v.version}</strong>
                  <span className={`pill ${VERSION_ESTADO_PILL[v.estado]}`}>{VERSION_ESTADO_LABEL[v.estado] || v.estado}</span>
                  <span className="text-muted" style={{ fontSize: 12 }}>
                    {fmtFecha(v.fecha)}
                  </span>
                </div>
                {(v.renderUrls.length > 0 || v.mapaUrl) && (
                  <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    {v.renderUrls.map((url, i) => (
                      <Archivo key={url} url={url} alt={`render ${i + 1}`} />
                    ))}
                    {v.mapaUrl && <Archivo url={v.mapaUrl} alt="plano" />}
                  </div>
                )}
                {v.nota && <p style={{ margin: "6px 0 0", fontSize: 13.5 }}>{v.nota}</p>}
                <span className="text-muted" style={{ fontSize: 11 }}>
                  Subido por {v.subidoPor?.nombre || v.autor || "—"}
                </span>
                {v.revisadoEn && (
                  <p className="text-muted" style={{ fontSize: 11.5, margin: "4px 0 0" }}>
                    {VERSION_ESTADO_LABEL[v.estado]} por {v.revisadoPor?.nombre || "—"} · {fmtFechaHora(v.revisadoEn)}
                    {v.comentario && `: ${v.comentario}`}
                  </p>
                )}
              </div>
            ))}
          </div>
          {canEdit &&
            (() => {
              const ultima = espacio.versiones[0];
              const puedeSubir = !ultima || ultima.estado === "RECHAZADA";
              if (puedeSubir) return <SubirVersionStaffForm espacioId={espacio.id} />;
              return (
                <p className="text-muted" style={{ marginTop: 12, fontSize: 13 }}>
                  {ultima.estado === "APROBADA"
                    ? "Esta versión ya fue aprobada. No se necesitan más versiones."
                    : "Hay una versión en revisión. Apruébala o recházala en "}
                  {ultima.estado !== "APROBADA" && <Link href="/renders">Renders</Link>}
                  {ultima.estado !== "APROBADA" && " antes de subir otra."}
                </p>
              );
            })()}

          <h6 className="text-muted" style={{ marginTop: 28 }}>
            Comentarios
          </h6>
          <ComentariosEspacio
            espacioId={espacio.id}
            canEdit={canEdit}
            comentarios={espacio.comentarios.map((c) => ({
              id: c.id,
              texto: c.texto,
              autor: c.autor,
              fecha: c.fecha.toISOString(),
            }))}
          />
        </section>

        <aside>
          <h6 className="text-muted">Especificaciones</h6>
          <table className="table">
            <tbody>
              <EspecificacionesEspacio
                espacioId={espacio.id}
                numero={espacio.numero}
                canEdit={canEdit}
                medidas={espacio.medidas}
                areaM2={espacio.areaM2}
                alturaMaxCm={espacio.alturaMaxCm}
                autosEnPiso={espacio.autosEnPiso}
                cargaElectricaKw={espacio.cargaElectricaKw}
                puntosLuz={espacio.puntosLuz}
                proveedorId={espacio.proveedorId}
                proveedorNombre={espacio.proveedor?.nombre ?? null}
                distribuidorId={espacio.distribuidorId}
                distribuidorNombre={espacio.distribuidor?.nombre ?? null}
                montajeInicio={toISODate(espacio.montajeInicio)}
                montajeFin={toISODate(espacio.montajeFin)}
                ultimaEntrega={toISODate(espacio.ultimaEntrega)}
                proveedores={proveedores}
                distribuidores={distribuidores}
              />
              <ContactoEspacio
                espacioId={espacio.id}
                canEdit={canEdit}
                personaContacto={espacio.personaContacto}
                telefonoContacto={espacio.telefonoContacto}
                correoContacto={espacio.correoContacto}
              />
              <SupervisorAsignado
                espacioId={espacio.id}
                canEdit={canEdit}
                esAdmin={session?.user.rol === "ADMIN"}
                userId={session?.user.id || ""}
                userNombre={session?.user.name || ""}
                supervisorId={espacio.supervisorId}
                supervisorNombre={espacio.supervisor?.nombre ?? null}
                supervisores={supervisores}
              />
            </tbody>
          </table>

          {espacio.incumplimientos.length > 0 && (
            <>
              <h6 className="text-muted" style={{ marginTop: 24 }}>
                Incumplimientos abiertos
              </h6>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {espacio.incumplimientos.map((i) => (
                  <div key={i.id} className="card" style={{ borderLeft: "3px solid var(--color-accent)" }}>
                    <strong style={{ fontSize: 13 }}>{i.titulo}</strong>
                    <span className="text-muted" style={{ fontSize: 12 }}>
                      {i.detalle}
                    </span>
                  </div>
                ))}
              </div>
              <Link href="/incumplimientos" className="btn-ghost" style={{ marginTop: 8 }}>
                Ver en incumplimientos →
              </Link>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
