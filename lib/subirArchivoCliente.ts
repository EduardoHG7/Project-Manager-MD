import { upload } from "@vercel/blob/client";

function extension(file: File): string {
  return (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
}

/**
 * Sube un archivo directamente desde el navegador a Vercel Blob (sin pasar
 * por un Server Action), para no chocar con su límite de tamaño de body.
 * Devuelve la URL con la que luego se sirve el archivo (/api/archivos/...).
 */
export async function subirArchivoCliente(file: File, carpeta: string): Promise<string> {
  const nombre = `${carpeta}/${crypto.randomUUID()}.${extension(file)}`;
  const blob = await upload(nombre, file, {
    access: "private",
    handleUploadUrl: "/api/upload",
  });
  return `/api/archivos/${blob.pathname}`;
}
