"use client";

import { useState, useTransition } from "react";
import { actualizarEspacio } from "@/lib/actions";

type SiNo = boolean | null;

function fmtSiNo(v: SiNo) {
  return v === null ? "—" : v ? "Sí" : "No";
}

const WIFI_MB = [20, 50, 100, 200];
const CABLEADO_MB = [10, 20, 30, 50, 100, 200];

export function RequisitosMontajeEspacio({
  espacioId,
  canEdit,
  riggingPuntos,
  manliftBrazo,
  manliftBrazoHorasMontaje,
  manliftBrazoHorasDesmontaje,
  montacargas,
  montacargasHorasMontaje,
  montacargasHorasDesmontaje,
  internet,
  internetWifi,
  internetWifiMb,
  internetCableado,
  internetCableadoMb,
  internetPortalCautivo,
  internetP2P,
  internetSalidaAdicional,
  internetIpPublica,
}: {
  espacioId: string;
  canEdit: boolean;
  riggingPuntos: number | null;
  manliftBrazo: SiNo;
  manliftBrazoHorasMontaje: number | null;
  manliftBrazoHorasDesmontaje: number | null;
  montacargas: SiNo;
  montacargasHorasMontaje: number | null;
  montacargasHorasDesmontaje: number | null;
  internet: SiNo;
  internetWifi: SiNo;
  internetWifiMb: number | null;
  internetCableado: SiNo;
  internetCableadoMb: number | null;
  internetPortalCautivo: SiNo;
  internetP2P: SiNo;
  internetSalidaAdicional: SiNo;
  internetIpPublica: SiNo;
}) {
  const [campos, setCampos] = useState({
    riggingPuntos: riggingPuntos ?? "",
    manliftBrazo: manliftBrazo === null ? "" : String(manliftBrazo),
    manliftBrazoHorasMontaje: manliftBrazoHorasMontaje ?? "",
    manliftBrazoHorasDesmontaje: manliftBrazoHorasDesmontaje ?? "",
    montacargas: montacargas === null ? "" : String(montacargas),
    montacargasHorasMontaje: montacargasHorasMontaje ?? "",
    montacargasHorasDesmontaje: montacargasHorasDesmontaje ?? "",
    internet: internet === null ? "" : String(internet),
    internetWifi: internetWifi === null ? "" : String(internetWifi),
    internetWifiMb: internetWifiMb ?? "",
    internetCableado: internetCableado === null ? "" : String(internetCableado),
    internetCableadoMb: internetCableadoMb ?? "",
    internetPortalCautivo: internetPortalCautivo === null ? "" : String(internetPortalCautivo),
    internetP2P: internetP2P === null ? "" : String(internetP2P),
    internetSalidaAdicional: internetSalidaAdicional === null ? "" : String(internetSalidaAdicional),
    internetIpPublica: internetIpPublica === null ? "" : String(internetIpPublica),
  });
  const [isPending, startTransition] = useTransition();

  function guardar(cambios: Record<string, string | number>) {
    setCampos((prev) => ({ ...prev, ...cambios }));
    startTransition(() => actualizarEspacio(espacioId, cambios));
  }

  if (!canEdit) {
    return (
      <>
        <tr>
          <td className="text-muted">Puntos de rigging</td>
          <td style={{ textAlign: "right" }}>{riggingPuntos ?? "—"}</td>
        </tr>
        <tr>
          <td className="text-muted">Manlift / brazo</td>
          <td style={{ textAlign: "right" }}>{fmtSiNo(manliftBrazo)}</td>
        </tr>
        {manliftBrazo && (
          <tr>
            <td className="text-muted">Horas manlift (montaje / desmontaje)</td>
            <td style={{ textAlign: "right" }}>
              {manliftBrazoHorasMontaje ?? "—"} / {manliftBrazoHorasDesmontaje ?? "—"}
            </td>
          </tr>
        )}
        <tr>
          <td className="text-muted">Montacargas</td>
          <td style={{ textAlign: "right" }}>{fmtSiNo(montacargas)}</td>
        </tr>
        {montacargas && (
          <tr>
            <td className="text-muted">Horas montacargas (montaje / desmontaje)</td>
            <td style={{ textAlign: "right" }}>
              {montacargasHorasMontaje ?? "—"} / {montacargasHorasDesmontaje ?? "—"}
            </td>
          </tr>
        )}
        <tr>
          <td className="text-muted">Internet</td>
          <td style={{ textAlign: "right" }}>{fmtSiNo(internet)}</td>
        </tr>
        {internet && (
          <>
            <tr>
              <td className="text-muted">Wifi</td>
              <td style={{ textAlign: "right" }}>{internetWifi ? `Sí, ${internetWifiMb ?? "—"} Mb` : fmtSiNo(internetWifi)}</td>
            </tr>
            <tr>
              <td className="text-muted">Cableado</td>
              <td style={{ textAlign: "right" }}>
                {internetCableado ? `Sí, ${internetCableadoMb ?? "—"} Mb` : fmtSiNo(internetCableado)}
              </td>
            </tr>
            <tr>
              <td className="text-muted">Clave por portal cautivo</td>
              <td style={{ textAlign: "right" }}>{fmtSiNo(internetPortalCautivo)}</td>
            </tr>
            <tr>
              <td className="text-muted">P2P a red sin internet (con proveedor)</td>
              <td style={{ textAlign: "right" }}>{fmtSiNo(internetP2P)}</td>
            </tr>
            <tr>
              <td className="text-muted">Salida adicional (cableado dedicado o P2P)</td>
              <td style={{ textAlign: "right" }}>{fmtSiNo(internetSalidaAdicional)}</td>
            </tr>
            <tr>
              <td className="text-muted">IP pública dedicada (VPN)</td>
              <td style={{ textAlign: "right" }}>{fmtSiNo(internetIpPublica)}</td>
            </tr>
          </>
        )}
      </>
    );
  }

  function SelectSiNo({ campo, label }: { campo: keyof typeof campos; label: string }) {
    return (
      <tr>
        <td className="text-muted">{label}</td>
        <td style={{ textAlign: "right" }}>
          <select
            className="input"
            style={{ textAlign: "right" }}
            value={campos[campo] as string}
            disabled={isPending}
            onChange={(e) => guardar({ [campo]: e.target.value })}
          >
            <option value="">— Sin definir —</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr>
        <td className="text-muted">Puntos de rigging</td>
        <td style={{ textAlign: "right" }}>
          <input
            className="input"
            type="number"
            min={0}
            style={{ textAlign: "right" }}
            defaultValue={campos.riggingPuntos}
            disabled={isPending}
            onBlur={(e) => {
              if (e.target.value !== String(campos.riggingPuntos)) guardar({ riggingPuntos: e.target.value });
            }}
          />
        </td>
      </tr>

      <SelectSiNo campo="manliftBrazo" label="Manlift / brazo" />
      {campos.manliftBrazo === "true" && (
        <tr>
          <td className="text-muted">Horas manlift (montaje / desmontaje)</td>
          <td style={{ textAlign: "right" }}>
            <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
              <input
                className="input"
                type="number"
                min={0}
                style={{ width: 70, textAlign: "right" }}
                placeholder="Montaje"
                defaultValue={campos.manliftBrazoHorasMontaje}
                disabled={isPending}
                onBlur={(e) => {
                  if (e.target.value !== String(campos.manliftBrazoHorasMontaje))
                    guardar({ manliftBrazoHorasMontaje: e.target.value });
                }}
              />
              <input
                className="input"
                type="number"
                min={0}
                style={{ width: 70, textAlign: "right" }}
                placeholder="Desmontaje"
                defaultValue={campos.manliftBrazoHorasDesmontaje}
                disabled={isPending}
                onBlur={(e) => {
                  if (e.target.value !== String(campos.manliftBrazoHorasDesmontaje))
                    guardar({ manliftBrazoHorasDesmontaje: e.target.value });
                }}
              />
            </div>
          </td>
        </tr>
      )}

      <SelectSiNo campo="montacargas" label="Montacargas" />
      {campos.montacargas === "true" && (
        <tr>
          <td className="text-muted">Horas montacargas (montaje / desmontaje)</td>
          <td style={{ textAlign: "right" }}>
            <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
              <input
                className="input"
                type="number"
                min={0}
                style={{ width: 70, textAlign: "right" }}
                placeholder="Montaje"
                defaultValue={campos.montacargasHorasMontaje}
                disabled={isPending}
                onBlur={(e) => {
                  if (e.target.value !== String(campos.montacargasHorasMontaje))
                    guardar({ montacargasHorasMontaje: e.target.value });
                }}
              />
              <input
                className="input"
                type="number"
                min={0}
                style={{ width: 70, textAlign: "right" }}
                placeholder="Desmontaje"
                defaultValue={campos.montacargasHorasDesmontaje}
                disabled={isPending}
                onBlur={(e) => {
                  if (e.target.value !== String(campos.montacargasHorasDesmontaje))
                    guardar({ montacargasHorasDesmontaje: e.target.value });
                }}
              />
            </div>
          </td>
        </tr>
      )}

      <SelectSiNo campo="internet" label="Internet" />
      {campos.internet === "true" && (
        <>
          <SelectSiNo campo="internetWifi" label="Wifi" />
          {campos.internetWifi === "true" && (
            <tr>
              <td className="text-muted">Velocidad wifi</td>
              <td style={{ textAlign: "right" }}>
                <select
                  className="input"
                  style={{ textAlign: "right" }}
                  value={campos.internetWifiMb}
                  disabled={isPending}
                  onChange={(e) => guardar({ internetWifiMb: e.target.value })}
                >
                  <option value="">— Sin definir —</option>
                  {WIFI_MB.map((mb) => (
                    <option key={mb} value={mb}>
                      {mb} Mb
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          )}

          <SelectSiNo campo="internetCableado" label="Cableado" />
          {campos.internetCableado === "true" && (
            <tr>
              <td className="text-muted">Velocidad cableado</td>
              <td style={{ textAlign: "right" }}>
                <select
                  className="input"
                  style={{ textAlign: "right" }}
                  value={campos.internetCableadoMb}
                  disabled={isPending}
                  onChange={(e) => guardar({ internetCableadoMb: e.target.value })}
                >
                  <option value="">— Sin definir —</option>
                  {CABLEADO_MB.map((mb) => (
                    <option key={mb} value={mb}>
                      {mb} Mb
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          )}

          <SelectSiNo campo="internetPortalCautivo" label="Clave por portal cautivo" />
          <SelectSiNo campo="internetP2P" label="P2P a red sin internet (con proveedor)" />
          <SelectSiNo campo="internetSalidaAdicional" label="Salida adicional (cableado dedicado o P2P)" />
          <SelectSiNo campo="internetIpPublica" label="IP pública dedicada (VPN)" />
        </>
      )}
    </>
  );
}
