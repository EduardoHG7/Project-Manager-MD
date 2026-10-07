/**
 * Reduce una foto en el navegador antes de subirla: las fotos de iPad/iPhone
 * pesan varios MB (y pueden venir en HEIC), y Vercel rechaza cuerpos de más
 * de 4.5MB antes de que lleguen a /api/subir-archivo. Se redimensiona a
 * `maxLado` px y se re-codifica como JPEG. Si el navegador no puede decodificar
 * la imagen, devuelve el archivo original.
 */
export async function comprimirImagen(file: File, maxLado = 2000, calidad = 0.85): Promise<File> {
  if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) return file;

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("No se pudo leer la imagen."));
      i.src = url;
    });

    const escala = Math.min(1, maxLado / Math.max(img.naturalWidth, img.naturalHeight));
    const ancho = Math.round(img.naturalWidth * escala);
    const alto = Math.round(img.naturalHeight * escala);

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, ancho, alto);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", calidad));
    if (!blob) return file;

    const nombre = (file.name.replace(/\.[^.]+$/, "") || "foto") + ".jpg";
    return new File([blob], nombre, { type: "image/jpeg" });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}
