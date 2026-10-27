import { useCallback, useEffect, useRef, useState } from "react";
import { ErroApi } from "@/api/erros";
import { supabase } from "@/api/supabase";
import { assinarMudancasDaCaixa, type ClienteRealtime } from "@/lib/chatAoVivo";
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
import { usePapel, useSessao } from "@/lib/sessao";

export type Consulta<T> = {
  dados: T | null;
  carregando: boolean;
  erro: string | null;
  recarregar: () => void;
};

type EntradaCacheConsulta = { dados: unknown; salvaEm: number };
const cacheConsultas = new Map<string, EntradaCacheConsulta>();

function lerCacheConsulta<T>(chave: string, ttlMs: number): T | null {
  if (ttlMs <= 0) return null;
  const entrada = cacheConsultas.get(chave);
  if (!entrada) return null;
  if (Date.now() - entrada.salvaEm > ttlMs) {
    cacheConsultas.delete(chave);
    return null;
  }
  return entrada.dados as T;
}

function guardarCacheConsulta<T>(chave: string, dados: T) {
  if (cacheConsultas.size >= 20 && !cacheConsultas.has(chave)) {
    const maisAntiga = cacheConsultas.keys().next().value;
    if (maisAntiga) cacheConsultas.delete(maisAntiga);
  }
  cacheConsultas.set(chave, { dados, salvaEm: Date.now() });
}

function aguardar(ms: number, sinal: AbortSignal): Promise<void> {
  return new Promise((resolver, rejeitar) => {
    const cancelar = () => {
      clearTimeout(temporizador);
      rejeitar(sinal.reason ?? new DOMException("Consulta cancelada", "AbortError"));
    };
    const temporizador = setTimeout(() => {
      sinal.removeEventListener("abort", cancelar);
      resolver();
    }, ms);
    if (sinal.aborted) cancelar();
    else sinal.addEventListener("abort", cancelar, { once: true });
  });
}

function falhaTransitoria(erro: unknown): boolean {
  return erro instanceof ErroApi && (erro.codigo === "rede" || [502, 503, 504].includes(erro.status));
}

/**
 * Consulta que cancela a anterior quando o filtro muda, mantém os últimos dados na tela durante a
 * nova busca. Sessão que não renova mais (401) volta ao login pelo cliente HTTP (`lib/api.ts`).
 * \`intervaloMs\` liga a atualização automática (só enquanto a aba está visível).
 */
export function useConsulta<T>(
  buscar: (sinal: AbortSignal) => Promise<T>,
  chave: string,
  {
    ativa = true,
    intervaloMs,
    cacheMs = 0,
    repeticoesAutomaticas = 0,
  }: { ativa?: boolean; intervaloMs?: number; cacheMs?: number; repeticoesAutomaticas?: number } = {},
): Consulta<T> {
  const [dados, setDados] = useState<T | null>(() => lerCacheConsulta<T>(chave, cacheMs));
  const [carregando, setCarregando] = useState(ativa && lerCacheConsulta<T>(chave, cacheMs) === null);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  // A função muda a cada render; a chave é quem diz quando a consulta mudou de verdade.
  const buscarRef = useRef(buscar);
  buscarRef.current = buscar;

  useEffect(() => {
    if (!ativa) return;
    const controle = new AbortController();
    const dadosEmCache = lerCacheConsulta<T>(chave, cacheMs);
    let primeira = dadosEmCache === null;
    let emAndamento = false;
    if (dadosEmCache !== null) {
      setDados(dadosEmCache);
      setCarregando(false);
    }

    const executar = async () => {
      if (emAndamento) return;
      emAndamento = true;
      if (primeira) {
        setCarregando(true);
      }
      setErro(null);
      try {
        let resultado: T;
        for (let tentativaAtual = 0; ; tentativaAtual += 1) {
          try {
            resultado = await buscarRef.current(controle.signal);
            break;
          } catch (erro) {
            if (
              controle.signal.aborted ||
              tentativaAtual >= repeticoesAutomaticas ||
              !falhaTransitoria(erro)
            ) {
              throw erro;
            }
            await aguardar(1500 * (tentativaAtual + 1), controle.signal);
          }
        }
        if (controle.signal.aborted) return;
        setDados(resultado);
        if (cacheMs > 0) guardarCacheConsulta(chave, resultado);
        setErro(null);
        setCarregando(false);
      } catch (erro: unknown) {
        if (controle.signal.aborted) return;
        setErro(erro instanceof ErroApi ? erro.message : "Não foi possível carregar os dados.");
        setCarregando(false);
      } finally {
        primeira = false;
        emAndamento = false;
      }
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
  }, [chave, ativa, intervaloMs, cacheMs, repeticoesAutomaticas, tentativa]);

  const recarregar = useCallback(() => setTentativa((n) => n + 1), []);
  return { dados, carregando, erro, recarregar };
}

/**
 * Recarrega assim que o Realtime avisa que chegou chamado ou mensagem, ou que um chamado mudou. O RLS
 * decide o que a pessoa recebe. Sem Realtime, a conferência periódica de cada consulta segura a tela.
 */
function useRecarregarAoVivo(ativa: boolean, recarregar: () => void) {
  useEffect(() => {
    if (!ativa) return;
    try {
      return assinarMudancasDaCaixa(supabase() as unknown as ClienteRealtime, recarregar);
    } catch {
      return undefined;
    }
  }, [ativa, recarregar]);
}

export const useOpcoesChamados = (idLoja?: string) =>
  useConsulta<OpcoesChamados>((sinal) => buscarOpcoes(idLoja, { sinal }), `opcoes:${idLoja ?? ""}`);

export function useResumoChamados(idLoja?: string) {
  const consulta = useConsulta<ResumoChamados>((sinal) => buscarResumo(idLoja, { sinal }), `resumo:${idLoja ?? ""}`, {
    intervaloMs: 30_000,
  });
  useRecarregarAoVivo(true, consulta.recarregar);
  return consulta;
}

/** A fila se atualiza sozinha: chamado novo, assumido ou resolvido aparece sem recarregar a página. */
export function useListaChamados(filtros: FiltrosChamados) {
  const consulta = useConsulta<ListaChamados>((sinal) => listarChamados(filtros, { sinal }), JSON.stringify(filtros), {
    intervaloMs: 30_000,
  });
  useRecarregarAoVivo(true, consulta.recarregar);
  return consulta;
}

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
  const { dados, recarregar } = useConsulta<ResumoChamados>((sinal) => buscarResumo(undefined, { sinal }), "resumo-selo", {
    ativa,
    intervaloMs: 30_000,
  });
  useRecarregarAoVivo(ativa, recarregar);
  return ativa ? (dados?.sem_resposta ?? 0) : 0;
}
