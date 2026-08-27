"use client";

import { useState, useTransition } from "react";
import { crearUsuarioExpositor, regenerarContrasenaUsuario } from "@/lib/actions";

type UsuarioInfo = { id: string; email: string; activo: boolean } | null;

export function AccesoExpositor({ espacioId, usuario }: { espacioId: string; usuario: UsuarioInfo }) {
  const [isPending, startTransition] = useTransition();
  const [credenciales, setCredenciales] = useState<{ email: string; contrasena: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (credenciales) {
    return (
      <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>
        <div>
          <strong>{credenciales.email}</strong>
        </div>
        <div>
          Clave: <code>{credenciales.contrasena}</code>
        </div>
        <div className="text-muted">Anótala, no se volverá a mostrar.</div>
        <button className="btn-ghost" style={{ padding: 0, fontSize: 11 }} onClick={() => setCredenciales(null)}>
          Cerrar
        </button>
      </div>
    );
  }

  if (usuario) {
    return (
      <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>
        <div className="text-muted">{usuario.email}</div>
        {error && <p className="error-text" style={{ margin: 0 }}>{error}</p>}
        <button
          className="btn-ghost"
          style={{ padding: 0, fontSize: 11 }}
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              try {
                const res = await regenerarContrasenaUsuario(usuario.id);
                setCredenciales(res);
              } catch (err: any) {
                setError(err?.message || "No se pudo regenerar la contraseña.");
              }
            });
          }}
        >
          Regenerar clave
        </button>
      </div>
    );
  }

  return (
    <div>
      {error && <p className="error-text" style={{ margin: 0, fontSize: 11 }}>{error}</p>}
      <button
        className="btn-ghost"
        style={{ padding: 0, fontSize: 11.5 }}
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const res = await crearUsuarioExpositor(espacioId);
              setCredenciales(res);
            } catch (err: any) {
              setError(err?.message || "No se pudo crear el usuario.");
            }
          });
        }}
      >
        Crear acceso
      </button>
    </div>
  );
}
