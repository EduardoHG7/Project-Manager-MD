import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

async function guardarEnBlob(file: File, nombre: string, carpeta: string): Promise<string> {
  const { put } = await import("@vercel/blob");
  const path = `${carpeta}/${nombre}`;
  await put(path, file, { access: "private" });
  // El store es privado: la URL de Vercel Blob no es accesible directamente
  // desde el navegador. Se sirve a través de nuestra propia ruta, que la
  // busca en Blob con el SDK (get) en el servidor.
  return `/api/archivos/${path}`;
}

/**
 * En Vercel el disco no persiste entre invocaciones: si hay un token de
 * Vercel Blob configurado, los archivos se suben ahí. Sin token
 * (desarrollo local sin Blob configurado) caen a public/uploads en disco.
 */
export async function guardarArchivo(file: File, carpeta: string): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const nombre = `${randomUUID()}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return guardarEnBlob(file, nombre, carpeta);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, nombre), bytes);
  return `/uploads/${nombre}`;
}
