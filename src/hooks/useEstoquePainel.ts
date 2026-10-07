import { useEffect, useState } from "react";
import {
  buscarMovimentacoes,
  listarAjustes,
  buscarOpcoesEstoque,
  buscarSaldo,
  type Ajustes,
  type FiltrosAjustes,
  type FiltrosMovimentacoes,
  type FiltrosSaldo,
  type Movimentacoes,
  type OpcoesEstoque,
  type Saldo,
} from "@/lib/estoquePainelApi";
import { podeAprovar, usePapel, useSessao } from "@/lib/sessao";
import { useConsulta } from "./useChamados";

/** Filtros, peças e o escopo de quem está logado (vêm do servidor, não do navegador). */
export const useOpcoesEstoque = (idLoja?: string) =>
  useConsulta<OpcoesEstoque>((sinal) => buscarOpcoesEstoque(idLoja, { sinal }), `estoque-opcoes:${idLoja ?? ""}`);

/** Saldo por peça; reconsulta a cada 60 s para acompanhar as vendas e movimentações. */
export const useSaldoEstoque = (filtros: FiltrosSaldo) =>
  useConsulta<Saldo>((sinal) => buscarSaldo(filtros, { sinal }), `saldo:${JSON.stringify(filtros)}`, {
    intervaloMs: 60_000,
  });

export const useMovimentacoesEstoque = (filtros: FiltrosMovimentacoes) =>
  useConsulta<Movimentacoes>(
    (sinal) => buscarMovimentacoes(filtros, { sinal }),
    `movimentacoes:${JSON.stringify(filtros)}`,
    { intervaloMs: 60_000 },
  );

/** Pedidos de ajuste de inventário (o operador vê os seus; a gestão vê os da loja). */
export const useAjustesEstoque = (filtros: FiltrosAjustes, ativa = true) =>
  useConsulta<Ajustes>((sinal) => listarAjustes(filtros, { sinal }), `ajustes:${JSON.stringify(filtros)}`, {
    ativa,
    intervaloMs: 60_000,
  });

/** Quantos ajustes esperam decisão (selo da aba Aprovações). Só consulta quem pode decidir. */
export function useAjustesPendentes(): number {
  const sessao = useSessao();
  const papel = usePapel();
  const ativa = sessao?.tipo === "interno" && podeAprovar(papel);
  const { dados } = useAjustesEstoque({ situacao: "pendente", limit: 1, offset: 0 }, ativa);
  return ativa ? (dados?.pendentes ?? 0) : 0;
}

/** Valor que só muda depois de `espera` ms sem novas digitações (evita uma consulta por tecla). */
export function useAtraso<T>(valor: T, espera = 350): T {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const relogio = setTimeout(() => setAtrasado(valor), espera);
    return () => clearTimeout(relogio);
  }, [valor, espera]);
  return atrasado;
}
