import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Supervisión de Montaje",
  description: "Sistema de supervisión de montaje para ferias y eventos",
};

// Todo el sitio requiere sesión y datos en vivo — nada se beneficia de
// generación estática, y NextAuth's SessionProvider revienta el build al
// intentar prerenderizar si NEXTAUTH_URL no está disponible en ese momento.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
