import { buscarPendencias, type Pendencias } from "@/lib/gerenciaApi";
import { buscarDashboardRede, type DashboardRede, type FiltrosRede } from "@/lib/redeApi";
import { useSessao } from "@/lib/sessao";
import { useConsulta, type Consulta } from "./useChamados";

export type DadosRede = { rede: DashboardRede; pendencias: Pendencias };

/**
 * Início do admin: vendas, estoque e atendimento da rede (ou das lojas marcadas) e as pendências.
 * Mantém os últimos dados na tela durante uma nova consulta e atualiza a cada 2 minutos.
 */
export function useDashboardRede(filtros: FiltrosRede): Consulta<DadosRede> {
  const sessao = useSessao();
  const escopoCache = sessao?.tipo === "interno" ? `${sessao.papel}:${sessao.email}` : "sem-sessao";
  return useConsulta<DadosRede>(
    async (sinal) => {
      const [rede, pendencias] = await Promise.all([
        buscarDashboardRede(filtros, { sinal, timeoutMs: 75_000 }),
        buscarPendencias(undefined, { sinal, timeoutMs: 75_000 }),
      ]);
      return { rede, pendencias };
    },
    `rede:${escopoCache}:${JSON.stringify(filtros)}`,
    { intervaloMs: 120_000, cacheMs: 5 * 60_000, repeticoesAutomaticas: 1 },
  );
}
