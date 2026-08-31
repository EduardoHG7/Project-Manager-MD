/**
 * Sube un archivo desde el navegador a /api/subir-archivo (una ruta normal,
 * no un Server Action, así que no choca con su límite de 1MB) y el servidor
 * lo guarda en Vercel Blob. Devuelve la URL con la que luego se sirve
 * (/api/archivos/...).
 */
export async function subirArchivoCliente(file: File, carpeta: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("carpeta", carpeta);

  const res = await fetch("/api/subir-archivo", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "No se pudo subir el archivo.");
  }
  return data.url;
}
