import { useEffect, useState } from "react";
import {
  buscarMovimentacoes,
  buscarOpcoesEstoque,
  buscarSaldo,
  type FiltrosMovimentacoes,
  type FiltrosSaldo,
  type Movimentacoes,
  type OpcoesEstoque,
  type Saldo,
} from "@/lib/estoquePainelApi";
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

/** Valor que só muda depois de `espera` ms sem novas digitações (evita uma consulta por tecla). */
export function useAtraso<T>(valor: T, espera = 350): T {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const relogio = setTimeout(() => setAtrasado(valor), espera);
    return () => clearTimeout(relogio);
  }, [valor, espera]);
  return atrasado;
}
