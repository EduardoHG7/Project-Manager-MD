import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { actualizarEvento, archivarEvento } from "@/lib/actions";
import { EliminarEventoButton } from "../EliminarEventoButton";

export const dynamic = "force-dynamic";

function paraInput(d: Date | null) {
  return d ? d.toISOString().slice(0, 10) : "";
}

function detalleEvento(espacios: number, invitados: number) {
  const partes: string[] = [];
  if (espacios > 0) partes.push(`${espacios} espacio${espacios === 1 ? "" : "s"}`);
  if (invitados > 0) partes.push(`${invitados} invitado${invitados === 1 ? "" : "s"}`);
  return partes.length > 0 ? partes.join(" y ") : undefined;
}

export default async function EditarEventoPage({ params }: { params: { id: string } }) {
  const evento = await prisma.evento.findUnique({
    where: { id: params.id },
    include: { _count: { select: { espacios: true, invitados: true } } },
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
          <EliminarEventoButton
            eventoId={evento.id}
            nombre={evento.nombre}
            detalle={detalleEvento(evento._count.espacios, evento._count.invitados)}
            redirectTo="/admin/eventos"
            className="btn btn-secondary"
          />
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

        <div style={{ display: "flex", gap: 8 }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="pausaInicio">Pausa (cerrado al público) desde</label>
            <input className="input" id="pausaInicio" name="pausaInicio" type="date" defaultValue={paraInput(evento.pausaInicio)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="pausaFin">Pausa hasta</label>
            <input className="input" id="pausaFin" name="pausaFin" type="date" defaultValue={paraInput(evento.pausaFin)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="horariosNota">Horarios de atención al público</label>
          <textarea
            className="input"
            id="horariosNota"
            name="horariosNota"
            placeholder="Ej. Jueves y viernes 2:00pm a 9:00pm, sábado 12:00m-9:00pm, domingo 12:00m-7:00pm"
            defaultValue={evento.horariosNota || ""}
          />
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
