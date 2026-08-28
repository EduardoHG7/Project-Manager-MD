import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminEspaciosClient } from "./AdminEspaciosClient";

export const dynamic = "force-dynamic";

export default async function AdminEspaciosPage({ params }: { params: { id: string } }) {
  const evento = await prisma.evento.findUnique({ where: { id: params.id } });
  if (!evento) notFound();

  const [espacios, distribuidores, proveedores] = await Promise.all([
    prisma.espacio.findMany({
      where: { eventoId: evento.id },
      include: { distribuidor: true, proveedor: true },
      orderBy: [{ fila: "asc" }, { numero: "asc" }],
    }),
    prisma.distribuidor.findMany({ orderBy: { nombre: "asc" } }),
    prisma.proveedorConstructor.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  return (
    <AdminEspaciosClient
      eventoId={evento.id}
      eventoNombre={evento.nombre}
      planoUrl={evento.planoUrl}
      espacios={espacios.map((e) => ({
        id: e.id,
        numero: e.numero,
        nombre: e.nombre,
        categoria: e.categoria,
        fila: e.fila,
        medidas: e.medidas,
        areaM2: e.areaM2,
        alturaMaxCm: e.alturaMaxCm,
        estado: e.estado,
        x: e.x,
        y: e.y,
        personaContacto: e.personaContacto,
        telefonoContacto: e.telefonoContacto,
        correoContacto: e.correoContacto,
        distribuidorId: e.distribuidorId,
        proveedorId: e.proveedorId,
      }))}
      distribuidores={distribuidores}
      proveedores={proveedores}
    />
  );
}
