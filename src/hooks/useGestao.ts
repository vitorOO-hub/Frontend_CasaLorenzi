import {
  buscarAuditoria,
  buscarCatalogo,
  buscarIntegracoes,
  type Auditoria,
  type Catalogo,
  type Integracoes,
} from "@/lib/gestaoApi";
import { useConsulta } from "./useChamados";

/** Peças do catálogo (admin). A busca é feita no servidor; reconsulta depois de cada alteração. */
export const useCatalogo = (busca: string) =>
  useConsulta<Catalogo>((sinal) => buscarCatalogo(busca || undefined, { sinal }), `gestao-catalogo:${busca}`);

/** Quem fez o que na rede, do mais recente para o mais antigo. */
export const useAuditoria = (busca: string) =>
  useConsulta<Auditoria>((sinal) => buscarAuditoria(busca || undefined, { sinal }), `gestao-auditoria:${busca}`, {
    intervaloMs: 60_000,
  });

/** Lotes recebidos do ERP e registros a mapear. */
export const useIntegracoes = () =>
  useConsulta<Integracoes>((sinal) => buscarIntegracoes({ sinal }), "gestao-integracoes", { intervaloMs: 120_000 });
