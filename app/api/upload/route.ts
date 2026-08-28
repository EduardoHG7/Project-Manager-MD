import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Genera el token que permite subir archivos directamente desde el
// navegador a Vercel Blob, sin pasar por el límite de tamaño de los
// Server Actions (que en producción rechaza fotos grandes de celular/tablet).
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error("No autorizado.");
        return {
          allowedContentTypes: ["image/*", "application/pdf"],
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error al generar el token de subida." }, { status: 400 });
  }
}
