import { falha, objeto, texto } from "./validacao";

/**
 * Horário de funcionamento da loja (`loja.horario_funcionamento` no backend, app/core/horario.py).
 * Cada dia é `{ abre, fecha }` em HH:MM ou `null` (fechada); sem horário cadastrado, a loja inteira é `null`.
 */

export const DIAS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"] as const;
export type Dia = (typeof DIAS)[number];
export type Turno = { abre: string; fecha: string };
export type HorarioFuncionamento = Record<Dia, Turno | null>;

export const ROTULO_DIA: Record<Dia, string> = {
  seg: "Segunda",
  ter: "Terça",
  qua: "Quarta",
  qui: "Quinta",
  sex: "Sexta",
  sab: "Sábado",
  dom: "Domingo",
};

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

function turno(valor: unknown, campo: string): Turno | null {
  if (valor === null || valor === undefined) return null;
  const t = objeto(valor, campo);
  const abre = texto(t.abre, `${campo}.abre`);
  const fecha = texto(t.fecha, `${campo}.fecha`);
  if (!HORA.test(abre) || !HORA.test(fecha)) falha(campo);
  return { abre, fecha };
}

export function validarHorario(valor: unknown, campo = "horario_funcionamento"): HorarioFuncionamento | null {
  if (valor === null || valor === undefined) return null;
  const o = objeto(valor, campo);
  return Object.fromEntries(DIAS.map((d) => [d, turno(o[d], `${campo}.${d}`)])) as HorarioFuncionamento;
}

const curto = (dia: Dia) => ROTULO_DIA[dia].slice(0, 3);

/** "Seg a Sex 10:00–22:00 · Sáb 10:00–18:00 · Dom fechada": dias seguidos com o mesmo horário juntos. */
export function resumoHorario(horario: HorarioFuncionamento | null): string {
  if (!horario) return "Horário não cadastrado";
  const grupos: { de: Dia; ate: Dia; texto: string }[] = [];
  for (const dia of DIAS) {
    const t = horario[dia];
    const textoDia = t ? `${t.abre}–${t.fecha}` : "fechada";
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.texto === textoDia) ultimo.ate = dia;
    else grupos.push({ de: dia, ate: dia, texto: textoDia });
  }
  return grupos
    .map((g) => `${g.de === g.ate ? curto(g.de) : `${curto(g.de)} a ${curto(g.ate)}`} ${g.texto}`)
    .join(" · ");
}

/** Linha do formulário de edição: um dia, aberto ou não, com os dois horários. */
export type LinhaHorario = { dia: Dia; aberta: boolean; abre: string; fecha: string };

export const linhasDoHorario = (horario: HorarioFuncionamento | null): LinhaHorario[] =>
  DIAS.map((dia) => {
    const t = horario?.[dia];
    return { dia, aberta: Boolean(t), abre: t?.abre ?? "10:00", fecha: t?.fecha ?? "22:00" };
  });

/** Volta ao formato da API; devolve o primeiro problema em vez de mandar um horário que o servidor recusaria. */
export function horarioDasLinhas(linhas: LinhaHorario[]): { horario: HorarioFuncionamento } | { erro: string } {
  const horario = {} as HorarioFuncionamento;
  for (const l of linhas) {
    if (!l.aberta) {
      horario[l.dia] = null;
      continue;
    }
    if (!HORA.test(l.abre) || !HORA.test(l.fecha)) return { erro: `${ROTULO_DIA[l.dia]}: use o formato 10:00.` };
    if (l.fecha <= l.abre) return { erro: `${ROTULO_DIA[l.dia]}: o horário de fechar precisa ser depois do de abrir.` };
    horario[l.dia] = { abre: l.abre, fecha: l.fecha };
  }
  return { horario };
}
