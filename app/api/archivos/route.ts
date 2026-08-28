import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Sirve archivos guardados en un Blob Store privado de Vercel. La URL de
// Blob no es accesible directamente desde el navegador (requiere el token
// del servidor), así que esta ruta la busca con el token y la reenvía.
export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u");
  if (!u) return new Response("Falta el parámetro u.", { status: 400 });

  let blobUrl: URL;
  try {
    blobUrl = new URL(u);
  } catch {
    return new Response("URL inválida.", { status: 400 });
  }

  // Solo permitir hosts de Vercel Blob, para no convertir esta ruta en un
  // proxy abierto ni filtrar el token a otros destinos.
  if (!blobUrl.hostname.endsWith(".blob.vercel-storage.com")) {
    return new Response("Host no permitido.", { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return new Response("Blob no configurado.", { status: 500 });

  const res = await fetch(blobUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok || !res.body) {
    const detalle = await res.text().catch(() => "");
    console.error("GET /api/archivos falló", { url: blobUrl.toString(), status: res.status, detalle });
    return new Response(`No se pudo obtener el archivo (status ${res.status}): ${detalle}`, {
      status: res.status === 404 ? 404 : 502,
    });
  }

  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
