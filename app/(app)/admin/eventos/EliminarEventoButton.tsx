"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { eliminarEvento } from "@/lib/actions";

export function EliminarEventoButton({
  eventoId,
  nombre,
  detalle,
  redirectTo,
  className = "btn-ghost",
}: {
  eventoId: string;
  nombre: string;
  detalle?: string;
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className={className}
      style={{ color: "var(--color-accent)" }}
      disabled={isPending}
      onClick={() => {
        const advertencia = detalle
          ? `¿Eliminar el evento "${nombre}"? Esto también borrará ${detalle}. No se puede deshacer.`
          : `¿Eliminar el evento "${nombre}"? No se puede deshacer.`;
        if (!confirm(advertencia)) return;
        startTransition(async () => {
          await eliminarEvento(eventoId);
          if (redirectTo) router.push(redirectTo);
        });
      }}
    >
      {isPending ? "Eliminando…" : "Eliminar"}
    </button>
  );
}
