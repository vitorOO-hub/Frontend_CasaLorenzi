import type { Tom } from "@/components/ui";
import type { ItemReposicao, MovimentoDiaSemana } from "./gerenciaApi";

/** Regras de apresentação do início do gerente (sem React, para testar). */

export const DIAS_DA_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Média de pedidos por dia, na ordem domingo a sábado (dia sem registro vira 0). */
export function pedidosPorDiaDaSemana(movimento: MovimentoDiaSemana[]): number[] {
  return DIAS_DA_SEMANA.map((_, dia) => movimento.find((m) => m.dia_semana === dia)?.pedidos_por_dia ?? 0);
}

const arredondar = (dias: number) => Math.max(1, Math.round(dias));

/** Texto e cor do selo de cada peça da reposição prioritária. */
export function selosDaReposicao(item: ItemReposicao): { texto: string; tom: Tom } {
  if (item.situacao === "esgotada" || item.saldo === 0) return { texto: "Esgotada", tom: "perigo" };
  if (item.dias_cobertura !== null) {
    const dias = arredondar(item.dias_cobertura);
    return { texto: `~${dias} ${dias === 1 ? "dia" : "dias"}`, tom: item.dias_cobertura < 7 ? "alerta" : "neutro" };
  }
  // Sem giro não há previsão de dias; o que chama a atenção é estar no mínimo.
  return { texto: item.situacao === "abaixo_do_minimo" ? "No mínimo" : "Sem giro", tom: "alerta" };
}

/** "Camisa Linho · Branco, M" */
export const descricaoDaPeca = (item: Pick<ItemReposicao, "produto" | "cor" | "tamanho">) =>
  `${item.produto} · ${item.cor}, ${item.tamanho}`;

export type PendenciaDoGerente = { texto: string; valor: number; to: string };

/** As três pendências do topo, cada uma levando à tela que resolve. */
export function pendenciasDoGerente(p: {
  ajustes_para_aprovar: number;
  transferencias_aguardando: number;
  chamados_sem_resposta: number;
}): PendenciaDoGerente[] {
  return [
    { texto: "ajustes para aprovar", valor: p.ajustes_para_aprovar, to: "/painel/estoque/aprovacoes" },
    { texto: "transferências aguardando", valor: p.transferencias_aguardando, to: "/painel/estoque/transferencias" },
    { texto: "chamados sem resposta", valor: p.chamados_sem_resposta, to: "/painel/atendimento" },
  ];
}
