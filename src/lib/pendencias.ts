import { useChamadosSemResposta } from "@/hooks/useChamados";
import { useAjustesPendentes } from "@/hooks/useEstoquePainel";
import type { Pendencia } from "./navegacao";
import { useLojaEscopo } from "./sessao";
import { useEstado } from "./store";

/** Quantos itens esperam uma ação do usuário logado, por tipo de pendência. */
export function usePendencias(): Record<Pendencia, number> {
  const { transferencias, reposicoes } = useEstado();
  // Chamados vêm da API (contagem do servidor, já no escopo de loja de quem está logado).
  const chamadosSemResposta = useChamadosSemResposta();
  const escopo = useLojaEscopo();
  const minha = (lojaId: string | null) => !escopo || lojaId === escopo;

  // Ajustes a aprovar vêm da API (contagem do servidor, já no escopo de loja).
  const aprovacoes = useAjustesPendentes();

  const transf =
    transferencias.filter(
      (t) =>
        (t.status === "Pendente" && minha(t.origemId)) ||
        (t.status === "Aceita" && minha(t.destinoId)),
    ).length +
    reposicoes.filter(
      (r) =>
        r.status === "Aberta" &&
        r.solicitanteLojaId !== escopo &&
        (r.destinatarioLojaId === null || minha(r.destinatarioLojaId)),
    ).length;

  return { aprovacoes, transferencias: transf, chamados: chamadosSemResposta };
}
