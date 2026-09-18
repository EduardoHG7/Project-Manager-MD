import { describe, expect, it } from "vitest";
import { calcularEstado, calcularFechaFin, progresoPonderado } from "./cronograma";

describe("calcularFechaFin", () => {
  it("una tarea de 1 día termina el mismo día", () => {
    expect(calcularFechaFin(new Date("2026-10-01"), 1)).toEqual(new Date("2026-10-01"));
  });

  it("suma días corridos sin excluir fines de semana", () => {
    expect(calcularFechaFin(new Date("2026-10-01"), 5)).toEqual(new Date("2026-10-05"));
  });

  it("nunca da una duración menor a 1 día", () => {
    expect(calcularFechaFin(new Date("2026-10-01"), 0)).toEqual(new Date("2026-10-01"));
  });
});

describe("calcularEstado", () => {
  const hoy = new Date("2026-10-10");

  it("progreso 0 y fecha fin futura => NO_INICIADA", () => {
    expect(calcularEstado({ progreso: 0, fechaFin: new Date("2026-10-20"), hoy })).toBe("NO_INICIADA");
  });

  it("progreso entre 0 y 100 => EN_CURSO", () => {
    expect(calcularEstado({ progreso: 40, fechaFin: new Date("2026-10-20"), hoy })).toBe("EN_CURSO");
  });

  it("progreso 100 => COMPLETADA", () => {
    expect(calcularEstado({ progreso: 100, fechaFin: new Date("2026-10-01"), hoy })).toBe("COMPLETADA");
  });

  it("fecha fin vencida y progreso incompleto => ATRASADA, incluso con progreso 0", () => {
    expect(calcularEstado({ progreso: 0, fechaFin: new Date("2026-10-01"), hoy })).toBe("ATRASADA");
  });

  it("ATRASADA pisa a EN_CURSO cuando ambas condiciones aplican", () => {
    expect(calcularEstado({ progreso: 60, fechaFin: new Date("2026-10-01"), hoy })).toBe("ATRASADA");
  });

  it("progreso 100 gana aunque la fecha ya haya pasado", () => {
    expect(calcularEstado({ progreso: 100, fechaFin: new Date("2026-10-01"), hoy })).toBe("COMPLETADA");
  });
});

describe("progresoPonderado", () => {
  it("promedia ponderando por duración, no por cantidad de tareas", () => {
    const tareas = [
      { duracionDias: 1, progreso: 0 },
      { duracionDias: 9, progreso: 100 },
    ];
    expect(progresoPonderado(tareas)).toBe(90);
  });

  it("lista vacía da 0 sin dividir entre cero", () => {
    expect(progresoPonderado([])).toBe(0);
  });

  it("misma fórmula sirve para el avance global sobre todas las tareas", () => {
    const tareas = [
      { duracionDias: 5, progreso: 50 },
      { duracionDias: 5, progreso: 100 },
    ];
    expect(progresoPonderado(tareas)).toBe(75);
  });
});
