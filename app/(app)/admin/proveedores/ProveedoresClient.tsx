"use client";

import { useState, useTransition } from "react";
import { crearProveedor, eliminarProveedor } from "@/lib/actions";

type Proveedor = { id: string; nombre: string; contacto: string | null; telefono: string | null; stands: number };

export function ProveedoresClient({ proveedores }: { proveedores: Proveedor[] }) {
  const [form, setForm] = useState({ nombre: "", contacto: "", telefono: "" });
  const [isPending, startTransition] = useTransition();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 28, marginTop: 20, alignItems: "start" }}>
      <table className="table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Contacto</th>
            <th>Stands</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {proveedores.map((p) => (
            <tr key={p.id}>
              <td>{p.nombre}</td>
              <td className="text-muted">
                {p.contacto || "—"} {p.telefono ? `· ${p.telefono}` : ""}
              </td>
              <td className="text-muted">{p.stands}</td>
              <td>
                <button
                  className="btn-ghost"
                  disabled={isPending}
                  onClick={() => {
                    if (!confirm(`¿Eliminar "${p.nombre}"? Sus espacios quedarán sin proveedor asignado.`)) return;
                    startTransition(() => eliminarProveedor(p.id));
                  }}
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
          {proveedores.length === 0 && (
            <tr>
              <td colSpan={4} className="text-muted">
                Todavía no hay proveedores.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <form
        className="card elev-sm"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.nombre.trim()) return;
          startTransition(async () => {
            await crearProveedor(form);
            setForm({ nombre: "", contacto: "", telefono: "" });
          });
        }}
      >
        <h6 className="text-muted">Nuevo proveedor</h6>
        <div className="field">
          <label>Nombre</label>
          <input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </div>
        <div className="field">
          <label>Contacto</label>
          <input className="input" value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} />
        </div>
        <div className="field">
          <label>Teléfono</label>
          <input className="input" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
        </div>
        <button className="btn btn-primary btn-block" type="submit" disabled={isPending}>
          Agregar
        </button>
      </form>
    </div>
  );
}
