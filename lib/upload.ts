import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

async function guardarEnBlob(file: File, nombre: string, carpeta: string): Promise<string> {
  const { put } = await import("@vercel/blob");
  const blob = await put(`${carpeta}/${nombre}`, file, { access: "public" });
  return blob.url;
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
