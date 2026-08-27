import Link from "next/link";

export function SinEvento({ esAdmin }: { esAdmin: boolean }) {
  return (
    <main className="page">
      <div className="card elev-sm" style={{ maxWidth: 480, margin: "60px auto", textAlign: "center", padding: 32 }}>
        <h3 style={{ margin: 0 }}>Todavía no hay ningún evento cargado</h3>
        <p className="text-muted" style={{ marginTop: 8 }}>
          {esAdmin
            ? "Crea el primer evento — nombre, recinto, fechas y el plano del recinto — para empezar a armar el mapa de espacios."
            : "Pídele a un administrador que cargue el evento desde el panel de Admin."}
        </p>
        {esAdmin && (
          <Link href="/admin/eventos" className="btn btn-primary" style={{ marginTop: 8 }}>
            Ir a Admin → Eventos
          </Link>
        )}
      </div>
    </main>
  );
}
