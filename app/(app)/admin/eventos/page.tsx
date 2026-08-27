import Link from "next/link";
import { getEventos } from "@/lib/evento";
import { fmtFecha } from "@/lib/estados";
import { CrearEventoForm } from "./CrearEventoForm";

export const dynamic = "force-dynamic";

export default async function AdminEventosPage() {
  const eventos = await getEventos();

  return (
    <main className="page">
      <h1>Eventos</h1>
      <p className="text-muted">Cada evento tiene su propio plano, espacios y calendario.</p>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 380px", gap: 28, marginTop: 20, alignItems: "start" }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Recinto</th>
                <th>Fechas</th>
                <th>Plano</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((e) => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 700 }}>{e.nombre}</td>
                  <td className="text-muted">{e.recinto || "—"}</td>
                  <td className="text-muted">
                    {fmtFecha(e.fechaInicio)} – {fmtFecha(e.fechaFin)}
                  </td>
                  <td>{e.planoUrl ? "Sí" : "Sin subir"}</td>
                  <td>
                    <Link href={`/admin/eventos/${e.id}`} className="btn-ghost">
                      Editar →
                    </Link>
                  </td>
                </tr>
              ))}
              {eventos.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted">
                    Todavía no hay eventos. Crea el primero con el formulario.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <CrearEventoForm />
      </div>
    </main>
  );
}
