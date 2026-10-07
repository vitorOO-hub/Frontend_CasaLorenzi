import { useCallback, useEffect, useState } from "react";
import { ErroApi } from "@/lib/api";
import {
  buscarDashboard,
  buscarFila,
  type DashboardAtendimento,
  type FilaAtendimento,
  type FiltrosDashboard,
} from "@/lib/atendimentoApi";
import { sair } from "@/lib/sessao";

type Dados = { dashboard: DashboardAtendimento; fila: FilaAtendimento };

export type EstadoDashboard = {
  /** Últimos dados carregados; ficam na tela enquanto uma nova consulta está em andamento. */
  dados: Dados | null;
  carregando: boolean;
  erro: string | null;
  recarregar: () => void;
};

/** Busca o resumo e a fila juntos, cancelando a consulta antiga quando o filtro muda. */
export function useDashboardAtendimento(filtros: FiltrosDashboard): EstadoDashboard {
  const { inicio, fim, idLoja, canal, categoria } = filtros;
  const [dados, setDados] = useState<Dados | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    const controle = new AbortController();
    const consulta = { inicio, fim, idLoja, canal, categoria };
    setCarregando(true);
    setErro(null);

    Promise.all([
      buscarDashboard(consulta, { sinal: controle.signal }),
      buscarFila(consulta, 20, { sinal: controle.signal }),
    ])
      .then(([dashboard, fila]) => {
        if (controle.signal.aborted) return;
        setDados({ dashboard, fila });
        setCarregando(false);
      })
      .catch((e: unknown) => {
        if (controle.signal.aborted) return;
        // Sessão que não renova mais: volta para o login em vez de ficar numa tela quebrada.
        if (e instanceof ErroApi && e.status === 401) sair();
        setErro(e instanceof ErroApi ? e.message : "Não foi possível carregar os dados.");
        setCarregando(false);
      });

    return () => controle.abort();
  }, [inicio, fim, idLoja, canal, categoria, tentativa]);

  const recarregar = useCallback(() => setTentativa((n) => n + 1), []);
  return { dados, carregando, erro, recarregar };
}
