import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getEventoSeleccionado } from "@/lib/evento";
import { ESTADO_LABEL, VERSION_ESTADO_LABEL, SEVERIDAD_LABEL, INCUMP_ESTADO_LABEL } from "@/lib/estados";
import { ImprimirAuto } from "./ImprimirAuto";

export const dynamic = "force-dynamic";

const DISCIPLINAS = ["DISENO", "ESTRUCTURA", "GRAFICA", "ELECTRICO"] as const;
const DISCIPLINA_LABEL: Record<string, string> = { DISENO: "Diseño", ESTRUCTURA: "Estructura", GRAFICA: "Gráfica", ELECTRICO: "Eléctrico" };
const ETAPA_ESTADO_LABEL: Record<string, string> = { PENDIENTE: "Pendiente", AHORA: "En curso", APROBADO: "Aprobado" };
const MATERIAL_ESTADO_LABEL: Record<string, string> = {
  CONFORME: "Conforme",
  EN_REVISION: "En revisión",
  NO_CONFORME: "No conforme",
  PENDIENTE: "Pendiente",
};

// Las fechas de montaje/entrega se guardan como día a medianoche UTC; se
// formatean en UTC para que no se corran un día al imprimir.
function fecha(d: Date | null | undefined) {
  if (!d) return "—";
  return d.toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

function fechaHora(d: Date | null | undefined) {
  if (!d) return "—";
  return d.toLocaleString("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Panama",
  });
}

function siNo(v: boolean | null | undefined) {
  return v === null || v === undefined ? "—" : v ? "Sí" : "No";
}

function val(v: string | number | null | undefined, sufijo = "") {
  return v === null || v === undefined || v === "" ? "—" : `${v}${sufijo}`;
}

type Fila = [string, React.ReactNode];

function TablaChequeo({ filas }: { filas: Fila[] }) {
  return (
    <table className="ck-table">
      <thead>
        <tr>
          <th style={{ width: "42%" }}>Concepto</th>
          <th>Valor registrado</th>
          <th className="ck-box-col">OK</th>
        </tr>
      </thead>
      <tbody>
        {filas.map(([label, valor]) => (
          <tr key={label}>
            <td className="ck-label">{label}</td>
            <td>{valor}</td>
            <td className="ck-box-col">
              <span className="ck-box" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function ChecklistStandPage({ params }: { params: { numero: string } }) {
  const evento = await getEventoSeleccionado();
  if (!evento) notFound();

  let espacio = await prisma.espacio.findUnique({
    where: { eventoId_numero: { eventoId: evento.id, numero: params.numero } },
    include: {
      distribuidor: true,
      proveedor: true,
      supervisor: true,
      etapas: true,
      materiales: { orderBy: { orden: "asc" } },
      versiones: { orderBy: { fecha: "desc" }, include: { subidoPor: true, revisadoPor: true } },
      incumplimientos: { where: { estado: { not: "CERRADA" } }, orderBy: { createdAt: "asc" } },
      comentarios: { orderBy: { fecha: "desc" } },
    },
  });
  if (!espacio) {
    const porNumeroAdicional = await prisma.espacio.findFirst({
      where: { eventoId: evento.id, numerosAdicionales: { has: params.numero } },
      select: { numero: true },
    });
    if (porNumeroAdicional) redirect(`/checklist/${encodeURIComponent(porNumeroAdicional.numero)}`);
  }
  if (!espacio) notFound();

  const e = espacio;
  const etapas = new Map(e.etapas.map((et) => [et.disciplina, et]));

  const especificaciones: Fila[] = [
    ["Número de stand", e.numero],
    ["Números adicionales", e.numerosAdicionales.length ? e.numerosAdicionales.join(", ") : "—"],
    ["Ubicación", e.fila ? `Hall ${e.fila}` : e.categoria],
    ["Medidas en planta", val(e.medidas)],
    ["Área", val(e.areaM2, " m²")],
    ["Altura máx. permitida", val(e.alturaMaxCm, " cm")],
    ["Autos en piso", val(e.autosEnPiso)],
    ["Gafetes entregados", val(e.gafetesEntregados)],
    ["Cortesías pagadas", val(e.cortesiasPagadas)],
    ["Pases de carro", val(e.pasesCarro)],
    ["Carga eléctrica", val(e.cargaElectricaKw, " kW")],
    ["Puntos de 110v", val(e.puntos110v)],
    ["Puntos de 220v", val(e.puntos220v)],
    ["¿Usará rigging?", siNo(e.usaRigging)],
    ["Proveedor constructor", e.proveedor?.nombre || "—"],
    ["Grupo / distribuidor", e.distribuidor?.nombre || "—"],
    ["Montaje (desde – hasta)", `${fecha(e.montajeInicio)} – ${fecha(e.montajeFin)}`],
    ["Última entrega", fecha(e.ultimaEntrega)],
  ];

  const contacto: Fila[] = [
    ["Persona de contacto", val(e.personaContacto)],
    ["Teléfono", val(e.telefonoContacto)],
    ["Correo", val(e.correoContacto)],
    ["Supervisor asignado", e.supervisor?.nombre || "—"],
  ];

  const requisitos: Fila[] = [
    ["Puntos de rigging", val(e.riggingPuntos)],
    ["Manlift / brazo", siNo(e.manliftBrazo)],
    ...(e.manliftBrazo
      ? ([["Horas manlift (montaje / desmontaje)", `${val(e.manliftBrazoHorasMontaje)} / ${val(e.manliftBrazoHorasDesmontaje)}`]] as Fila[])
      : []),
    ["Montacargas", siNo(e.montacargas)],
    ...(e.montacargas
      ? ([["Horas montacargas (montaje / desmontaje)", `${val(e.montacargasHorasMontaje)} / ${val(e.montacargasHorasDesmontaje)}`]] as Fila[])
      : []),
    ["Internet", siNo(e.internet)],
    ...(e.internet
      ? ([
          ["Wifi", e.internetWifi ? `Sí, ${val(e.internetWifiMb)} Mb` : siNo(e.internetWifi)],
          ["Cableado", e.internetCableado ? `Sí, ${val(e.internetCableadoMb)} Mb` : siNo(e.internetCableado)],
          ["Clave por portal cautivo", siNo(e.internetPortalCautivo)],
          ["P2P a red sin internet (con proveedor)", siNo(e.internetP2P)],
          ["Salida adicional (cableado dedicado o P2P)", siNo(e.internetSalidaAdicional)],
          ["IP pública dedicada (VPN)", siNo(e.internetIpPublica)],
        ] as Fila[])
      : []),
  ];

  const documentos: Fila[] = [
    ["Requerimiento de internet", e.documentoInternetUrl ? "Subido" : "Sin subir"],
    ["Requerimiento de montacargas", e.documentoMontacargasUrl ? "Subido" : "Sin subir"],
    ["Requerimiento de voltaje", e.documentoVoltajeUrl ? "Subido" : "Sin subir"],
    ["Requerimiento de rigging", e.documentoRiggingUrl ? "Subido" : "Sin subir"],
  ];

  const progreso: Fila[] = DISCIPLINAS.map((d) => {
    const et = etapas.get(d);
    const estado = ETAPA_ESTADO_LABEL[et?.estado || "PENDIENTE"];
    return [DISCIPLINA_LABEL[d], et?.detalle ? `${estado} · ${et.detalle}` : estado] as Fila;
  });

  const marca = e.distribuidor?.nombre ? `${e.nombre} (${e.distribuidor.nombre})` : e.nombre;

  return (
    <main className="ck-page">
      <style>{CSS}</style>
      <ImprimirAuto />

      <header className="ck-header">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-magicdreams.png" alt="Magic Dreams Productions" style={{ height: 34, display: "block" }} />
          <div className="ck-kicker" style={{ marginTop: 8 }}>
            Checklist de stand · {evento.nombre}
            {evento.recinto ? ` · ${evento.recinto}` : ""}
          </div>
          <h1 className="ck-title">
            {e.nombre} <span className="ck-title-num">· Espacio {[e.numero, ...e.numerosAdicionales].join(", ")}</span>
          </h1>
        </div>
        <div className="ck-meta">
          <div>
            <span>Estado:</span> <strong>{e.incumplimientos.length ? "Desviación abierta" : ESTADO_LABEL[e.estado] || e.estado}</strong>
          </div>
          <div>
            <span>Impreso:</span> {fechaHora(new Date())}
          </div>
        </div>
      </header>

      <div className="ck-grid">
        <section>
          <h2 className="ck-h">Especificaciones</h2>
          <TablaChequeo filas={especificaciones} />
        </section>
        <section>
          <h2 className="ck-h">Contacto</h2>
          <TablaChequeo filas={contacto} />
          <h2 className="ck-h">Requisitos de montaje</h2>
          <TablaChequeo filas={requisitos} />
        </section>
      </div>

      <div className="ck-grid">
        <section>
          <h2 className="ck-h">Progreso por disciplina</h2>
          <TablaChequeo filas={progreso} />
        </section>
        <section>
          <h2 className="ck-h">Documentos</h2>
          <TablaChequeo filas={documentos} />
        </section>
      </div>

      <section className="ck-avoid-break">
        <h2 className="ck-h">Stand finalizado</h2>
        {!e.fotoFinal1Url && !e.fotoFinal2Url ? (
          <p className="ck-empty">Sin fotos del stand finalizado.</p>
        ) : (
          <div className="ck-fotos">
            {[e.fotoFinal1Url, e.fotoFinal2Url].map((url, i) =>
              url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt={`Stand finalizado · foto ${i + 1}`} />
              ) : (
                <div key={i} className="ck-foto-vacia">Foto {i + 1} · sin subir</div>
              )
            )}
          </div>
        )}
      </section>

      <section className="ck-avoid-break">
        <h2 className="ck-h">Materiales y acabados</h2>
        {e.materiales.length === 0 ? (
          <p className="ck-empty">Sin elementos registrados.</p>
        ) : (
          <table className="ck-table">
            <thead>
              <tr>
                <th>Elemento</th>
                <th>Material / acabado</th>
                <th>Color · Pantone</th>
                <th>Estado</th>
                <th className="ck-box-col">OK</th>
              </tr>
            </thead>
            <tbody>
              {e.materiales.map((m) => (
                <tr key={m.id}>
                  <td className="ck-label">{m.elemento}</td>
                  <td>{val(m.material)}</td>
                  <td>{val(m.color)}</td>
                  <td>{MATERIAL_ESTADO_LABEL[m.estado] || m.estado}</td>
                  <td className="ck-box-col">
                    <span className="ck-box" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="ck-avoid-break">
        <h2 className="ck-h">Historial de versiones (render / plano)</h2>
        {e.versiones.length === 0 ? (
          <p className="ck-empty">Aún no hay versiones registradas.</p>
        ) : (
          <table className="ck-table">
            <thead>
              <tr>
                <th>Versión</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Archivos</th>
                <th>Subido por</th>
                <th>Revisión</th>
              </tr>
            </thead>
            <tbody>
              {e.versiones.map((v) => (
                <tr key={v.id}>
                  <td className="ck-label">{v.version}</td>
                  <td>{VERSION_ESTADO_LABEL[v.estado] || v.estado}</td>
                  <td>{fechaHora(v.fecha)}</td>
                  <td>
                    {v.renderUrls.length} render{v.renderUrls.length === 1 ? "" : "s"}
                    {v.mapaUrl ? " + plano" : ""}
                  </td>
                  <td>
                    {v.subidoPor?.nombre || v.autor || "—"}
                    {v.nota && <div className="ck-note">{v.nota}</div>}
                  </td>
                  <td>
                    {v.revisadoEn ? `${v.revisadoPor?.nombre || "—"} · ${fechaHora(v.revisadoEn)}` : "—"}
                    {v.comentario && <div className="ck-note">{v.comentario}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="ck-avoid-break">
        <h2 className="ck-h">Incumplimientos abiertos</h2>
        {e.incumplimientos.length === 0 ? (
          <p className="ck-empty">Sin incumplimientos abiertos.</p>
        ) : (
          <table className="ck-table">
            <thead>
              <tr>
                <th>Incumplimiento</th>
                <th>Severidad</th>
                <th>Estado</th>
                <th>Fecha límite</th>
                <th className="ck-box-col">OK</th>
              </tr>
            </thead>
            <tbody>
              {e.incumplimientos.map((i) => (
                <tr key={i.id}>
                  <td className="ck-label">
                    {i.titulo}
                    {i.detalle && <div className="ck-note">{i.detalle}</div>}
                  </td>
                  <td>{SEVERIDAD_LABEL[i.severidad] || i.severidad}</td>
                  <td>{INCUMP_ESTADO_LABEL[i.estado] || i.estado}</td>
                  <td>{fecha(i.fechaLimite)}</td>
                  <td className="ck-box-col">
                    <span className="ck-box" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="ck-avoid-break">
        <h2 className="ck-h">Comentarios</h2>
        {e.comentarios.length === 0 ? (
          <p className="ck-empty">Sin comentarios registrados.</p>
        ) : (
          <ul className="ck-comments">
            {e.comentarios.map((c) => (
              <li key={c.id}>
                <span className="ck-note">
                  {c.autor || "—"} · {fechaHora(c.fecha)}
                </span>
                <div>{c.texto}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ck-avoid-break">
        <h2 className="ck-h">Observaciones</h2>
        <div className="ck-lines">
          <div />
          <div />
          <div />
          <div />
        </div>
      </section>

      <section className="ck-firmas">
        <div className="ck-firma">
          <div className="ck-firma-linea" />
          <strong>Responsable de ADAP</strong>
          <div className="ck-firma-campos">
            <span>Nombre: ____________________________</span>
            <span>Fecha: ______________</span>
          </div>
        </div>
        <div className="ck-firma">
          <div className="ck-firma-linea" />
          <strong>Responsable de la marca · {marca}</strong>
          <div className="ck-firma-campos">
            <span>Nombre: ____________________________</span>
            <span>Fecha: ______________</span>
          </div>
        </div>
      </section>
    </main>
  );
}

const CSS = `
  @page { size: letter; margin: 12mm; }
  body { background: #fff; }
  .ck-page { max-width: 960px; margin: 0 auto; padding: 24px; font-size: 12px; line-height: 1.4; color: #201e1d; }
  .ck-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; border-bottom: 2px solid #201e1d; padding-bottom: 10px; margin-bottom: 14px; }
  .ck-kicker { font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #605d5d; }
  .ck-title { font-size: 22px; font-weight: 800; margin: 2px 0 0; }
  .ck-title-num { font-weight: 600; color: #605d5d; font-size: 16px; }
  .ck-meta { text-align: right; font-size: 11px; }
  .ck-meta span { color: #605d5d; }
  .ck-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .ck-h { font-size: 10.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #201e1d; margin: 14px 0 6px; padding-bottom: 3px; border-bottom: 1px solid #d7d3d3; }
  .ck-table { width: 100%; border-collapse: collapse; }
  .ck-table th { text-align: left; font-size: 9.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: #605d5d; padding: 4px 6px; border-bottom: 1px solid #bab6b6; }
  .ck-table td { padding: 4px 6px; border-bottom: 1px solid #eae7e7; vertical-align: top; }
  .ck-table tr { break-inside: avoid; }
  .ck-label { font-weight: 600; }
  .ck-box-col { width: 34px; text-align: center !important; }
  .ck-box { display: inline-block; width: 12px; height: 12px; border: 1.3px solid #444141; border-radius: 2px; }
  .ck-note { font-size: 10.5px; color: #605d5d; margin-top: 2px; white-space: pre-wrap; }
  .ck-empty { color: #7d7979; font-style: italic; margin: 4px 0; }
  .ck-comments { list-style: none; padding: 0; margin: 0; }
  .ck-comments li { padding: 5px 0; border-bottom: 1px solid #eae7e7; break-inside: avoid; white-space: pre-wrap; }
  .ck-fotos { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .ck-fotos img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border: 1px solid #d7d3d3; border-radius: 3px; display: block; }
  .ck-foto-vacia { aspect-ratio: 4 / 3; display: flex; align-items: center; justify-content: center; border: 1px dashed #bab6b6; color: #7d7979; font-style: italic; }
  .ck-lines div { height: 22px; border-bottom: 1px solid #bab6b6; }
  .ck-firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 48px; break-inside: avoid; }
  .ck-firma { font-size: 11.5px; }
  .ck-firma-linea { border-bottom: 1.5px solid #201e1d; height: 56px; margin-bottom: 6px; }
  .ck-firma-campos { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; color: #444141; }
  .ck-avoid-break { break-inside: avoid; }
  @media print {
    .no-print { display: none !important; }
    .ck-page { padding: 0; max-width: none; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;
