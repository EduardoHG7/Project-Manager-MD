import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { guardarArchivo } from "@/lib/upload";

export const dynamic = "force-dynamic";

// Ruta normal (no Server Action) para subir un archivo: evita el límite de
// 1MB que Next.js impone a los Server Actions. El navegador solo habla con
// nuestro propio servidor (mismo origen, sin problemas de CORS); el
// servidor es quien sube el archivo a Vercel Blob con el token.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const formData = await req.formData();
  const carpeta = String(formData.get("carpeta") || "archivos").replace(/[^a-z0-9-]/gi, "") || "archivos";
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  }

  try {
    const url = await guardarArchivo(file, carpeta);
    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "No se pudo subir el archivo." }, { status: 500 });
  }
}
