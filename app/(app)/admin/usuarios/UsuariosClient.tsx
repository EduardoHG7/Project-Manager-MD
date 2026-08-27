"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { activarUsuario, crearUsuarioOperacion, regenerarContrasenaUsuario } from "@/lib/actions";

type Usuario = { id: string; nombre: string; email: string; rol: string; activo: boolean };

const ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "LECTURA", label: "Lectura" },
];

export function UsuariosClient({ usuarios }: { usuarios: Usuario[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ nombre: "", email: "", rol: "LECTURA" });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [credenciales, setCredenciales] = useState<{ email: string; contrasena: string } | null>(null);
  const [pendingRegen, setPendingRegen] = useState<string | null>(null);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 28, marginTop: 20, alignItems: "start" }}>
      <table className="table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id}>
              <td>{u.nombre}</td>
              <td className="text-muted">{u.email}</td>
              <td>{ROLES.find((r) => r.value === u.rol)?.label || u.rol}</td>
              <td>
                <span className={`pill ${u.activo ? "pill-ink" : "pill-ghost"}`}>{u.activo ? "Activo" : "Desactivado"}</span>
              </td>
              <td style={{ display: "flex", gap: 10 }}>
                <button
                  className="btn-ghost"
                  disabled={isPending}
                  onClick={() => {
                    setPendingRegen(u.id);
                    startTransition(async () => {
                      try {
                        const res = await regenerarContrasenaUsuario(u.id);
                        setCredenciales(res);
                      } catch (err: any) {
                        setError(err?.message || "No se pudo regenerar la contraseña.");
                      } finally {
                        setPendingRegen(null);
                      }
                    });
                  }}
                >
                  {pendingRegen === u.id ? "Generando…" : "Regenerar clave"}
                </button>
                <button
                  className="btn-ghost"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await activarUsuario(u.id, !u.activo);
                      router.refresh();
                    })
                  }
                >
                  {u.activo ? "Desactivar" : "Activar"}
                </button>
              </td>
            </tr>
          ))}
          {usuarios.length === 0 && (
            <tr>
              <td colSpan={5} className="text-muted">
                Todavía no hay usuarios de operación.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {credenciales && (
          <div className="card elev-sm">
            <h6 className="text-muted">Usuario creado</h6>
            <p style={{ margin: 0, fontSize: 13 }}>
              <strong>{credenciales.email}</strong>
              <br />
              Clave: <code>{credenciales.contrasena}</code>
            </p>
            <p className="text-muted" style={{ fontSize: 11.5 }}>Anótala, no se volverá a mostrar.</p>
            <button className="btn-ghost" style={{ padding: 0, fontSize: 11.5 }} onClick={() => setCredenciales(null)}>
              Cerrar
            </button>
          </div>
        )}

        <form
          className="card elev-sm"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            if (!form.nombre.trim() || !form.email.trim()) return;
            startTransition(async () => {
              try {
                const res = await crearUsuarioOperacion(form);
                setCredenciales(res);
                setForm({ nombre: "", email: "", rol: "LECTURA" });
                router.refresh();
              } catch (err: any) {
                setError(err?.message || "No se pudo crear el usuario.");
              }
            });
          }}
        >
          <h6 className="text-muted">Nuevo usuario de operación</h6>
          <div className="field">
            <label>Nombre</label>
            <input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div className="field">
            <label>Usuario</label>
            <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field">
            <label>Rol</label>
            <select className="input" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-primary btn-block" type="submit" disabled={isPending}>
            Crear usuario
          </button>
        </form>
      </div>
    </div>
  );
}
