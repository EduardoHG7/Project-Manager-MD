import { crearEvento } from "@/lib/actions";

export function CrearEventoForm() {
  return (
    <form action={crearEvento} className="card elev-sm">
      <h6 className="text-muted">Nuevo evento</h6>

      <div className="field">
        <label htmlFor="nombre">Nombre</label>
        <input className="input" id="nombre" name="nombre" required placeholder="ej. Panama Motor Show Oct 2027" />
      </div>
      <div className="field">
        <label htmlFor="recinto">Recinto</label>
        <input className="input" id="recinto" name="recinto" placeholder="ej. Panama Convention Center" />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="fechaInicio">Apertura</label>
          <input className="input" id="fechaInicio" name="fechaInicio" type="date" required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="fechaFin">Cierre</label>
          <input className="input" id="fechaFin" name="fechaFin" type="date" required />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="montajeInicio">Inicia montaje</label>
          <input className="input" id="montajeInicio" name="montajeInicio" type="date" />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="montajeFin">Cierra montaje</label>
          <input className="input" id="montajeFin" name="montajeFin" type="date" />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="desmontajeInicio">Inicia desmontaje</label>
          <input className="input" id="desmontajeInicio" name="desmontajeInicio" type="date" />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="desmontajeFin">Cierra desmontaje</label>
          <input className="input" id="desmontajeFin" name="desmontajeFin" type="date" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="plano">Plano del recinto (imagen)</label>
        <input className="input" id="plano" name="plano" type="file" accept="image/*" />
      </div>

      <button className="btn btn-primary btn-block" type="submit">
        Crear evento
      </button>
    </form>
  );
}
