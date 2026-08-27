import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { actualizarEvento, archivarEvento } from "@/lib/actions";

export const dynamic = "force-dynamic";

function paraInput(d: Date | null) {
  return d ? d.toISOString().slice(0, 10) : "";
}

export default async function EditarEventoPage({ params }: { params: { id: string } }) {
  const evento = await prisma.evento.findUnique({
    where: { id: params.id },
    include: { _count: { select: { espacios: true } } },
  });
  if (!evento) notFound();

  const actualizarConId = actualizarEvento.bind(null, evento.id);
  const archivarConId = archivarEvento.bind(null, evento.id, !evento.activo);

  return (
    <main className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h6 className="text-muted">Editar evento</h6>
          <h2 style={{ margin: 0 }}>{evento.nombre}</h2>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/admin/eventos/${evento.id}/espacios`} className="btn btn-primary">
            Cargar espacios en el plano ({evento._count.espacios})
          </Link>
          <form action={archivarConId}>
            <button className="btn btn-secondary" type="submit">
              {evento.activo ? "Archivar" : "Reactivar"}
            </button>
          </form>
        </div>
      </div>

      <form action={actualizarConId} className="card elev-sm" style={{ maxWidth: 560, marginTop: 20 }}>
        <div className="field">
          <label htmlFor="nombre">Nombre</label>
          <input className="input" id="nombre" name="nombre" defaultValue={evento.nombre} required />
        </div>
        <div className="field">
          <label htmlFor="recinto">Recinto</label>
          <input className="input" id="recinto" name="recinto" defaultValue={evento.recinto || ""} />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="fechaInicio">Apertura</label>
            <input className="input" id="fechaInicio" name="fechaInicio" type="date" defaultValue={paraInput(evento.fechaInicio)} required />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="fechaFin">Cierre</label>
            <input className="input" id="fechaFin" name="fechaFin" type="date" defaultValue={paraInput(evento.fechaFin)} required />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="montajeInicio">Inicia montaje</label>
            <input className="input" id="montajeInicio" name="montajeInicio" type="date" defaultValue={paraInput(evento.montajeInicio)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="montajeFin">Cierra montaje</label>
            <input className="input" id="montajeFin" name="montajeFin" type="date" defaultValue={paraInput(evento.montajeFin)} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="desmontajeInicio">Inicia desmontaje</label>
            <input className="input" id="desmontajeInicio" name="desmontajeInicio" type="date" defaultValue={paraInput(evento.desmontajeInicio)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="desmontajeFin">Cierra desmontaje</label>
            <input className="input" id="desmontajeFin" name="desmontajeFin" type="date" defaultValue={paraInput(evento.desmontajeFin)} />
          </div>
        </div>

        {evento.planoUrl && (
          <div className="field">
            <label>Plano actual</label>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={evento.planoUrl} alt="Plano actual" style={{ border: "1px solid var(--color-divider)" }} />
          </div>
        )}
        <div className="field">
          <label htmlFor="plano">{evento.planoUrl ? "Reemplazar plano" : "Subir plano"}</label>
          <input className="input" id="plano" name="plano" type="file" accept="image/*" />
        </div>

        <button className="btn btn-primary btn-block" type="submit">
          Guardar cambios
        </button>
      </form>
    </main>
  );
}
