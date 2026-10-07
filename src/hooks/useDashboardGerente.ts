import { useCallback, useEffect, useState } from "react";
import { ErroApi } from "@/api/erros";
import { buscarDashboard, type DashboardAtendimento } from "@/lib/atendimentoApi";
import {
  buscarDashboardGerente,
  buscarPendencias,
  buscarReposicao,
  type DashboardGerente,
  type FiltrosGerente,
  type Pendencias,
  type Reposicao,
} from "@/lib/gerenciaApi";
import { sair } from "@/lib/sessao";

export type DadosGerente = {
  vendas: DashboardGerente;
  reposicao: Reposicao;
  pendencias: Pendencias;
  chamados: DashboardAtendimento;
};

export type EstadoGerente = {
  /** Últimos dados carregados; ficam na tela enquanto uma nova consulta está em andamento. */
  dados: DadosGerente | null;
  carregando: boolean;
  erro: string | null;
  recarregar: () => void;
};

/**
 * Busca vendas, reposição, pendências e chamados da unidade juntos, cancelando a consulta antiga
 * quando o filtro muda. Atualiza sozinho a cada 2 minutos enquanto a aba está à vista.
 */
export function useDashboardGerente(filtros: FiltrosGerente): EstadoGerente {
  const { inicio, fim, idLoja, categoria, canal } = filtros;
  const [dados, setDados] = useState<DadosGerente | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    const controle = new AbortController();
    const opcoes = { sinal: controle.signal };
    let primeira = true;

    const carregar = () => {
      if (primeira) {
        setCarregando(true);
        setErro(null);
      }
      Promise.all([
        buscarDashboardGerente({ inicio, fim, idLoja, categoria, canal }, opcoes),
        buscarReposicao({ idLoja, categoria, limite: 6 }, opcoes),
        buscarPendencias(idLoja, opcoes),
        buscarDashboard({ inicio, fim, idLoja }, opcoes),
      ])
        .then(([vendas, reposicao, pendencias, chamados]) => {
          if (controle.signal.aborted) return;
          setDados({ vendas, reposicao, pendencias, chamados });
          setErro(null);
          setCarregando(false);
        })
        .catch((e: unknown) => {
          if (controle.signal.aborted) return;
          // Sessão que não renova mais: volta para o login em vez de ficar numa tela quebrada.
          if (e instanceof ErroApi && e.status === 401) sair();
          setErro(e instanceof ErroApi ? e.message : "Não foi possível carregar os dados.");
          setCarregando(false);
        })
        .finally(() => {
          primeira = false;
        });
    };

    carregar();
    const relogio = setInterval(() => {
      if (document.visibilityState === "visible") carregar();
    }, 120_000);
    return () => {
      controle.abort();
      clearInterval(relogio);
    };
  }, [inicio, fim, idLoja, categoria, canal, tentativa]);

  const recarregar = useCallback(() => setTentativa((n) => n + 1), []);
  return { dados, carregando, erro, recarregar };
}
