import { NextRequest } from "next/server";
import { get } from "@vercel/blob";

export const dynamic = "force-dynamic";

// Sirve archivos guardados en un Blob Store privado de Vercel usando el
// método oficial del SDK (get), en vez de pedir la URL directamente.
export async function GET(_req: NextRequest, { params }: { params: { pathname: string[] } }) {
  const pathname = params.pathname.join("/");

  try {
    const blob = await get(pathname, { access: "private" });
    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      return new Response("No se encontró el archivo.", { status: 404 });
    }

    return new Response(blob.stream, {
      headers: {
        "Content-Type": blob.blob.contentType || "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err: any) {
    console.error("GET /api/archivos falló", { pathname, error: err?.message });
    return new Response(`No se pudo obtener el archivo: ${err?.message || "error desconocido"}`, { status: 502 });
  }
}
