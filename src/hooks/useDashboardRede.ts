import { buscarPendencias, type Pendencias } from "@/lib/gerenciaApi";
import { buscarDashboardRede, type DashboardRede, type FiltrosRede } from "@/lib/redeApi";
import { useConsulta, type Consulta } from "./useChamados";

export type DadosRede = { rede: DashboardRede; pendencias: Pendencias };

/**
 * Início do admin: vendas, estoque e atendimento da rede (ou das lojas marcadas) e as pendências.
 * Mantém os últimos dados na tela durante uma nova consulta e atualiza a cada 2 minutos.
 */
export function useDashboardRede(filtros: FiltrosRede): Consulta<DadosRede> {
  return useConsulta<DadosRede>(
    async (sinal) => {
      const [rede, pendencias] = await Promise.all([
        buscarDashboardRede(filtros, { sinal }),
        buscarPendencias(undefined, { sinal }),
      ]);
      return { rede, pendencias };
    },
    `rede:${JSON.stringify(filtros)}`,
    { intervaloMs: 120_000 },
  );
}
