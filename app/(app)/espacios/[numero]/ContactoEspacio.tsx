"use client";

import { useState, useTransition } from "react";
import { actualizarContactoEspacio } from "@/lib/actions";

export function ContactoEspacio({
  espacioId,
  canEdit,
  personaContacto,
  telefonoContacto,
  correoContacto,
}: {
  espacioId: string;
  canEdit: boolean;
  personaContacto: string | null;
  telefonoContacto: string | null;
  correoContacto: string | null;
}) {
  const [campos, setCampos] = useState({
    personaContacto: personaContacto || "",
    telefonoContacto: telefonoContacto || "",
    correoContacto: correoContacto || "",
  });
  const [isPending, startTransition] = useTransition();

  function guardar(cambios: Partial<typeof campos>) {
    const actualizado = { ...campos, ...cambios };
    setCampos(actualizado);
    startTransition(() => actualizarContactoEspacio(espacioId, actualizado));
  }

  if (!canEdit) {
    return (
      <>
        <tr>
          <td className="text-muted">Persona de contacto</td>
          <td style={{ textAlign: "right" }}>{personaContacto || "—"}</td>
        </tr>
        <tr>
          <td className="text-muted">Teléfono</td>
          <td style={{ textAlign: "right" }}>{telefonoContacto || "—"}</td>
        </tr>
        <tr>
          <td className="text-muted">Correo</td>
          <td style={{ textAlign: "right" }}>
            {correoContacto ? <a href={`mailto:${correoContacto}`}>{correoContacto}</a> : "—"}
          </td>
        </tr>
      </>
    );
  }

  return (
    <>
      <tr>
        <td className="text-muted">Persona de contacto</td>
        <td style={{ textAlign: "right" }}>
          <input
            className="input"
            style={{ textAlign: "right" }}
            defaultValue={campos.personaContacto}
            disabled={isPending}
            onBlur={(e) => {
              if (e.target.value !== campos.personaContacto) guardar({ personaContacto: e.target.value });
            }}
          />
        </td>
      </tr>
      <tr>
        <td className="text-muted">Teléfono</td>
        <td style={{ textAlign: "right" }}>
          <input
            className="input"
            style={{ textAlign: "right" }}
            defaultValue={campos.telefonoContacto}
            disabled={isPending}
            onBlur={(e) => {
              if (e.target.value !== campos.telefonoContacto) guardar({ telefonoContacto: e.target.value });
            }}
          />
        </td>
      </tr>
      <tr>
        <td className="text-muted">Correo</td>
        <td style={{ textAlign: "right" }}>
          <input
            className="input"
            type="email"
            style={{ textAlign: "right" }}
            defaultValue={campos.correoContacto}
            disabled={isPending}
            onBlur={(e) => {
              if (e.target.value !== campos.correoContacto) guardar({ correoContacto: e.target.value });
            }}
          />
        </td>
      </tr>
    </>
  );
}
