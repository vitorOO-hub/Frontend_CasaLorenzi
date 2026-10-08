import { useChamadosSemResposta } from "@/hooks/useChamados";
import { useTransferenciasAguardando } from "@/hooks/useEstoquePainel";
import type { Pendencia } from "./navegacao";

/**
 * Quantos itens esperam uma ação do usuário logado, por tipo de pendência. Os números vêm do
 * servidor, já no escopo de loja de quem está logado.
 */
export function usePendencias(): Record<Pendencia, number> {
  return {
    transferencias: useTransferenciasAguardando(),
    chamados: useChamadosSemResposta(),
  };
}
