"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { actualizarEstadoEspacio } from "@/lib/actions";
import { ESTADOS, ESTADO_LABEL } from "@/lib/estados";

export function EstadoSelector({ espacioId, estadoActual }: { espacioId: string; estadoActual: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <select
      className="input"
      style={{ width: "auto" }}
      defaultValue={estadoActual}
      disabled={isPending}
      onChange={(e) =>
        startTransition(async () => {
          await actualizarEstadoEspacio(espacioId, e.target.value);
          router.refresh();
        })
      }
    >
      {ESTADOS.map((k) => (
        <option key={k} value={k}>
          {ESTADO_LABEL[k]}
        </option>
      ))}
    </select>
  );
}
