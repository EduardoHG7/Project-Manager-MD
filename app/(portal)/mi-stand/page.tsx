import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ESTADO_LABEL, VERSION_ESTADO_LABEL, VERSION_ESTADO_PILL, fmtFechaHora } from "@/lib/estados";
import { SubirVersionForm } from "./SubirVersionForm";

export const dynamic = "force-dynamic";

export default async function MiStandPage() {
  const session = await getServerSession(authOptions);
  const usuario = await prisma.usuario.findUnique({ where: { id: session!.user.id } });
  if (!usuario?.espacioId) {
    return (
      <main className="page">
        <div className="card elev-sm" style={{ maxWidth: 480, margin: "60px auto", textAlign: "center", padding: 32 }}>
          <h3 style={{ margin: 0 }}>Tu usuario no tiene un espacio asignado</h3>
          <p className="text-muted">Contacta al organizador del evento.</p>
        </div>
      </main>
    );
  }

  const espacio = await prisma.espacio.findUniqueOrThrow({
    where: { id: usuario.espacioId },
    include: {
      evento: true,
      versiones: { orderBy: { fecha: "desc" } },
    },
  });

  const ultima = espacio.versiones[0] || null;
  const puedeSubir = !ultima || ultima.estado === "RECHAZADA";

  return (
    <main className="page">
      <h6 className="text-muted">{espacio.evento.nombre}</h6>
      <h2 style={{ margin: 0 }}>
        {espacio.numero} · {espacio.nombre}
      </h2>
      <p className="text-muted">
        Sube el render y el plano de tu stand para aprobación. Mientras esté en revisión no podrás subir otra
        versión; si se rechaza, podrás subir la siguiente.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 380px", gap: 28, marginTop: 20, alignItems: "start" }}>
        <div>
          <h6 className="text-muted">Historial de versiones</h6>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {espacio.versiones.length === 0 && (
              <p className="text-muted">Todavía no has subido ningún render.</p>
            )}
            {espacio.versiones.map((v) => (
              <div key={v.id} className="card elev-sm">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>{v.version}</strong>
                  <span className={`pill ${VERSION_ESTADO_PILL[v.estado]}`}>{VERSION_ESTADO_LABEL[v.estado]}</span>
                </div>
                <span className="text-muted" style={{ fontSize: 11.5 }}>
                  Subido {fmtFechaHora(v.fecha)}
                </span>
                {(v.renderUrl || v.mapaUrl) && (
                  <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                    {v.renderUrl && (
                      <a href={v.renderUrl} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={v.renderUrl} alt="Render" style={{ width: 120, border: "1px solid var(--color-divider)" }} />
                      </a>
                    )}
                    {v.mapaUrl && (
                      <a href={v.mapaUrl} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={v.mapaUrl} alt="Plano" style={{ width: 120, border: "1px solid var(--color-divider)" }} />
                      </a>
                    )}
                  </div>
                )}
                {v.nota && <p style={{ margin: "6px 0 0", fontSize: 13 }}>{v.nota}</p>}
                {v.revisadoEn && (
                  <p className="text-muted" style={{ fontSize: 11.5, marginTop: 6 }}>
                    Revisado {fmtFechaHora(v.revisadoEn)}
                    {v.comentario && `: ${v.comentario}`}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <aside className="card elev-sm">
          <h6 className="text-muted">Estado actual</h6>
          <p style={{ fontWeight: 800, fontSize: 18, margin: 0 }}>{ESTADO_LABEL[espacio.estado]}</p>

          {puedeSubir ? (
            <SubirVersionForm />
          ) : ultima?.estado === "APROBADA" ? (
            <p className="text-muted" style={{ marginTop: 10 }}>
              Tu render ya fue aprobado. No se necesitan más versiones.
            </p>
          ) : (
            <p className="text-muted" style={{ marginTop: 10 }}>
              Tu render está en revisión. Te avisaremos si necesita cambios.
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}
