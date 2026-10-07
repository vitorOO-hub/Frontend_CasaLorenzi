import type { Tom } from "@/components/ui";
import type { ItemMovimentacao, SituacaoSaldo } from "./estoquePainelApi";

/** Regras de apresentação do saldo e das movimentações (sem React, para testar). */

export const ROTULO_SITUACAO: Record<SituacaoSaldo, string> = {
  ok: "OK",
  baixo: "Estoque baixo",
  esgotado: "Esgotado",
};

export const TOM_SITUACAO: Record<SituacaoSaldo, Tom> = { ok: "ok", baixo: "alerta", esgotado: "perigo" };

/** "Branco · M" (o SKU aparece à parte). */
export const detalheDaPeca = (p: { cor: string; tamanho: string }) => `${p.cor} · ${p.tamanho}`;

/** Quantidade de uma loja destacada: esgotada em vermelho, no mínimo ou abaixo em âmbar. */
export function destaqueDaQuantidade(quantidade: number, minimo: number): "perigo" | "alerta" | null {
  if (quantidade === 0) return "perigo";
  return quantidade <= minimo ? "alerta" : null;
}

/** Observação da linha do histórico: o motivo, e o pedido quando a movimentação veio de uma venda. */
export function observacaoDaMovimentacao(m: Pick<ItemMovimentacao, "motivo" | "numero_pedido">): string {
  const partes = [m.motivo, m.numero_pedido && !m.motivo?.includes(m.numero_pedido) ? `Pedido ${m.numero_pedido}` : null];
  return partes.filter(Boolean).join(" · ") || "—";
}

/** Quem registrou: o nome, ou "Sistema" quando foi automático (venda no site, por exemplo). */
export const responsavelDaMovimentacao = (m: Pick<ItemMovimentacao, "responsavel">) => m.responsavel ?? "Sistema";

/** Texto "1–25 de 1.840" da paginação. */
export function faixaDaPagina(pagina: number, porPagina: number, total: number): string {
  if (total === 0) return "0 de 0";
  const inicio = pagina * porPagina + 1;
  const fim = Math.min((pagina + 1) * porPagina, total);
  return `${inicio.toLocaleString("pt-BR")}–${fim.toLocaleString("pt-BR")} de ${total.toLocaleString("pt-BR")}`;
}
