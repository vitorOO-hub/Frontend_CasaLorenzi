import { useCallback, useEffect, useRef, useState } from "react";
import { ErroApi } from "@/api/erros";
import {
  buscarChamado,
  buscarOpcoes,
  buscarResumo,
  listarChamados,
  type DetalheChamado,
  type FiltrosChamados,
  type ListaChamados,
  type OpcoesChamados,
  type ResumoChamados,
} from "@/lib/chamadosApi";
import { sair, usePapel, useSessao } from "@/lib/sessao";

export type Consulta<T> = {
  dados: T | null;
  carregando: boolean;
  erro: string | null;
  recarregar: () => void;
};

/**
 * Consulta que cancela a anterior quando o filtro muda, mantém os últimos dados na tela durante a
 * nova busca e, se a sessão não renova mais (401), volta ao login em vez de ficar numa tela quebrada.
 * \`intervaloMs\` liga a atualização automática (só enquanto a aba está visível).
 */
export function useConsulta<T>(
  buscar: (sinal: AbortSignal) => Promise<T>,
  chave: string,
  { ativa = true, intervaloMs }: { ativa?: boolean; intervaloMs?: number } = {},
): Consulta<T> {
  const [dados, setDados] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(ativa);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  // A função muda a cada render; a chave é quem diz quando a consulta mudou de verdade.
  const buscarRef = useRef(buscar);
  buscarRef.current = buscar;

  useEffect(() => {
    if (!ativa) return;
    const controle = new AbortController();
    let primeira = true;

    const executar = () => {
      if (primeira) {
        setCarregando(true);
        setErro(null);
      }
      buscarRef
        .current(controle.signal)
        .then((resultado) => {
          if (controle.signal.aborted) return;
          setDados(resultado);
          setErro(null);
          setCarregando(false);
        })
        .catch((e: unknown) => {
          if (controle.signal.aborted) return;
          if (e instanceof ErroApi && e.status === 401) sair();
          setErro(e instanceof ErroApi ? e.message : "Não foi possível carregar os dados.");
          setCarregando(false);
        })
        .finally(() => {
          primeira = false;
        });
    };

    executar();
    const relogio = intervaloMs
      ? setInterval(() => {
          if (document.visibilityState === "visible") executar();
        }, intervaloMs)
      : null;
    return () => {
      controle.abort();
      if (relogio) clearInterval(relogio);
    };
  }, [chave, ativa, intervaloMs, tentativa]);

  const recarregar = useCallback(() => setTentativa((n) => n + 1), []);
  return { dados, carregando, erro, recarregar };
}

export const useOpcoesChamados = (idLoja?: string) =>
  useConsulta<OpcoesChamados>((sinal) => buscarOpcoes(idLoja, { sinal }), `opcoes:${idLoja ?? ""}`);

export const useResumoChamados = (idLoja?: string) =>
  useConsulta<ResumoChamados>((sinal) => buscarResumo(idLoja, { sinal }), `resumo:${idLoja ?? ""}`, {
    intervaloMs: 60_000,
  });

export const useListaChamados = (filtros: FiltrosChamados) =>
  useConsulta<ListaChamados>((sinal) => listarChamados(filtros, { sinal }), JSON.stringify(filtros));

/** Ficha do chamado. A conversa é do chat ao vivo (`useChatAoVivo`). */
export const useDetalheChamado = (id: string) =>
  useConsulta<DetalheChamado>((sinal) => buscarChamado(id, { sinal }), `detalhe:${id}`);

/**
 * Quantos chamados estão sem resposta, para o selo da barra lateral. Só consulta quem tem acesso à
 * área de atendimento, e só depois de a sessão estar pronta.
 */
export function useChamadosSemResposta(): number {
  const sessao = useSessao();
  const papel = usePapel();
  const ativa = sessao?.tipo === "interno" && ["atendente", "gerente_loja", "admin"].includes(papel);
  const { dados } = useConsulta<ResumoChamados>((sinal) => buscarResumo(undefined, { sinal }), "resumo-selo", {
    ativa,
    intervaloMs: 60_000,
  });
  return ativa ? (dados?.sem_resposta ?? 0) : 0;
}
