import type { MetodoDePagamento, NovaVenda, PecaNoEstoque } from "./vendasApi";

/** Regras puras da tela "Nova venda" (sem React, para testar). */

export const POR_PAGINA_VENDAS = 20;
export const QUANTIDADE_MAXIMA = 99;

export type LinhaDoCarrinho = { peca: PecaNoEstoque; quantidade: number };

/** A peça entra com 1 unidade; se já está no carrinho soma 1, sem passar do saldo da loja. */
export function adicionarPeca(carrinho: LinhaDoCarrinho[], peca: PecaNoEstoque): LinhaDoCarrinho[] {
  const existente = carrinho.find((l) => l.peca.id_variacao === peca.id_variacao);
  if (!existente) return peca.disponivel > 0 ? [...carrinho, { peca, quantidade: 1 }] : carrinho;
  return mudarQuantidade(carrinho, peca.id_variacao, existente.quantidade + 1);
}

/** Quantidade entre 1 e o menor de (saldo, 99); zero ou menos tira a peça do carrinho. */
export function mudarQuantidade(carrinho: LinhaDoCarrinho[], idVariacao: string, quantidade: number): LinhaDoCarrinho[] {
  if (!Number.isFinite(quantidade) || quantidade < 1) return carrinho.filter((l) => l.peca.id_variacao !== idVariacao);
  return carrinho.map((l) =>
    l.peca.id_variacao === idVariacao
      ? { ...l, quantidade: Math.min(Math.floor(quantidade), l.peca.disponivel, QUANTIDADE_MAXIMA) }
      : l,
  );
}

/** Soma em centavos, para 0,1 + 0,2 não virar 0,30000000000000004. */
export const totalDoCarrinho = (carrinho: LinhaDoCarrinho[]): number =>
  carrinho.reduce((soma, l) => soma + Math.round(l.peca.preco_venda * 100) * l.quantidade, 0) / 100;

export const totalDePecas = (carrinho: LinhaDoCarrinho[]): number => carrinho.reduce((s, l) => s + l.quantidade, 0);

export type ErrosVenda = { cliente?: string; itens?: string; pagamento?: string };

/** O que falta para lançar: cliente achado pelo CPF, ao menos uma peça e a forma de pagamento. */
export function validarVenda(
  idCliente: string | null,
  carrinho: LinhaDoCarrinho[],
  metodo: MetodoDePagamento | "",
): ErrosVenda {
  const erros: ErrosVenda = {};
  if (!idCliente) erros.cliente = "Busque o cliente pelo CPF.";
  if (carrinho.length === 0) erros.itens = "Adicione ao menos uma peça.";
  if (!metodo) erros.pagamento = "Escolha a forma de pagamento.";
  return erros;
}

export function montarVenda(cpf: string, carrinho: LinhaDoCarrinho[], metodo: MetodoDePagamento): NovaVenda {
  return {
    cpf,
    metodo_pagamento: metodo,
    itens: carrinho.map((l) => ({ id_variacao: l.peca.id_variacao, quantidade: l.quantidade })),
  };
}

/** Descrição curta da peça: "Camisa Oxford · Branco · M". */
export const rotuloDaPeca = (p: { produto: string; cor: string | null; tamanho: string | null }) =>
  [p.produto, p.cor, p.tamanho].filter(Boolean).join(" · ");
