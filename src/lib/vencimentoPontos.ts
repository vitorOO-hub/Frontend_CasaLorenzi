import { lista, numero, objeto, texto } from "./validacao";

/** Pontos que vencem nos próximos 30 dias, por data (o backend lança o que já venceu). */
export type AvisoDeVencimento = { pontos_a_vencer: number; proximos_vencimentos: { vence_em: string; pontos: number }[] };

/** Campos do aviso; resposta sem eles (backend antigo) vale como "nada a vencer". */
export function validarAvisoDeVencimento(o: Record<string, unknown>): AvisoDeVencimento {
  return {
    pontos_a_vencer: o.pontos_a_vencer === undefined ? 0 : numero(o.pontos_a_vencer, "pontos_a_vencer"),
    proximos_vencimentos: (o.proximos_vencimentos === undefined ? [] : lista(o.proximos_vencimentos, "proximos_vencimentos")).map((v, i) => {
      const p = objeto(v, `proximos_vencimentos.${i}`);
      return { vence_em: texto(p.vence_em, `proximos_vencimentos.${i}.vence_em`), pontos: numero(p.pontos, `proximos_vencimentos.${i}.pontos`) };
    }),
  };
}

const diaMes = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });

/** "1.200 pontos vencem nos próximos 30 dias (o primeiro lote em 05/11)", ou nulo sem nada a vencer. */
export function textoDoAviso(a: AvisoDeVencimento): string | null {
  if (a.pontos_a_vencer <= 0) return null;
  const primeiro = a.proximos_vencimentos[0];
  const plural = a.pontos_a_vencer === 1 ? "ponto vence" : "pontos vencem";
  const quando = !primeiro
    ? ""
    : a.proximos_vencimentos.length === 1
      ? ` (em ${diaMes(primeiro.vence_em)})`
      : ` (o primeiro lote em ${diaMes(primeiro.vence_em)})`;
  return `${a.pontos_a_vencer.toLocaleString("pt-BR")} ${plural} nos próximos 30 dias${quando}`;
}
