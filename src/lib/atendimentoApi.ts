import { api, type OpcoesApi } from "./api";

/** Tipos e chamadas do dashboard de atendimento (espelham app/dashboard/schemas.py do backend). */

export type Resumo = {
  total: number;
  resolvidos: number;
  taxa_resolucao: number;
  resposta_media_horas: number | null;
};

export type Opcao = { codigo: string; nome: string };

export type DashboardAtendimento = {
  periodo: { inicio: string; fim: string };
  periodo_anterior: { inicio: string; fim: string };
  atual: Resumo;
  anterior: Resumo;
  volume_diario: { data: string; total: number }[];
  por_categoria: (Opcao & { total: number })[];
  resposta_por_canal: (Opcao & { total: number; resposta_media_horas: number | null })[];
  opcoes: { lojas: { id_loja: string; nome: string }[]; canais: Opcao[]; categorias: Opcao[] };
  escopo: { papel: string; id_loja: string | null; pode_escolher_loja: boolean };
};

export type ItemFila = {
  id_atendimento: string;
  assunto: string;
  cliente_nome: string;
  canal_codigo: string;
  canal: string;
  categoria_codigo: string;
  categoria: string;
  prioridade_codigo: string;
  prioridade: string;
  status_codigo: string;
  status: string;
  aberto_em: string;
  id_loja: string | null;
  loja_nome: string | null;
  sem_resposta: boolean;
};

export type FilaAtendimento = {
  total_aberto: number;
  sem_resposta: number;
  urgentes: number;
  itens: ItemFila[];
};

export type FiltrosDashboard = {
  inicio: string;
  fim: string;
  idLoja?: string;
  canal?: string;
  categoria?: string;
};

// ---------- Validação do formato da resposta (nada de dado cru direto na tela) ----------

const falha = (campo: string): never => {
  throw new Error(`campo inválido: ${campo}`);
};

function objeto(valor: unknown, campo: string): Record<string, unknown> {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : falha(campo);
}

const lista = (valor: unknown, campo: string): unknown[] => (Array.isArray(valor) ? valor : falha(campo));
const texto = (valor: unknown, campo: string): string => (typeof valor === "string" ? valor : falha(campo));
const numero = (valor: unknown, campo: string): number =>
  typeof valor === "number" && Number.isFinite(valor) ? valor : falha(campo);
const numeroOuNulo = (valor: unknown, campo: string): number | null =>
  valor === null ? null : numero(valor, campo);
const textoOuNulo = (valor: unknown, campo: string): string | null =>
  valor === null ? null : texto(valor, campo);

function resumo(valor: unknown, campo: string): Resumo {
  const o = objeto(valor, campo);
  return {
    total: numero(o.total, `${campo}.total`),
    resolvidos: numero(o.resolvidos, `${campo}.resolvidos`),
    taxa_resolucao: numero(o.taxa_resolucao, `${campo}.taxa_resolucao`),
    resposta_media_horas: numeroOuNulo(o.resposta_media_horas, `${campo}.resposta_media_horas`),
  };
}

function opcao(valor: unknown, campo: string): Opcao {
  const o = objeto(valor, campo);
  return { codigo: texto(o.codigo, `${campo}.codigo`), nome: texto(o.nome, `${campo}.nome`) };
}

function periodo(valor: unknown, campo: string) {
  const o = objeto(valor, campo);
  return { inicio: texto(o.inicio, `${campo}.inicio`), fim: texto(o.fim, `${campo}.fim`) };
}

export function validarDashboard(dados: unknown): DashboardAtendimento {
  const o = objeto(dados, "dashboard");
  const opcoes = objeto(o.opcoes, "opcoes");
  const escopo = objeto(o.escopo, "escopo");
  return {
    periodo: periodo(o.periodo, "periodo"),
    periodo_anterior: periodo(o.periodo_anterior, "periodo_anterior"),
    atual: resumo(o.atual, "atual"),
    anterior: resumo(o.anterior, "anterior"),
    volume_diario: lista(o.volume_diario, "volume_diario").map((v, i) => {
      const d = objeto(v, `volume_diario[${i}]`);
      return { data: texto(d.data, "data"), total: numero(d.total, "total") };
    }),
    por_categoria: lista(o.por_categoria, "por_categoria").map((v, i) => ({
      ...opcao(v, `por_categoria[${i}]`),
      total: numero(objeto(v, "por_categoria").total, "total"),
    })),
    resposta_por_canal: lista(o.resposta_por_canal, "resposta_por_canal").map((v, i) => {
      const d = objeto(v, `resposta_por_canal[${i}]`);
      return {
        ...opcao(d, `resposta_por_canal[${i}]`),
        total: numero(d.total, "total"),
        resposta_media_horas: numeroOuNulo(d.resposta_media_horas, "resposta_media_horas"),
      };
    }),
    opcoes: {
      lojas: lista(opcoes.lojas, "opcoes.lojas").map((v, i) => {
        const l = objeto(v, `opcoes.lojas[${i}]`);
        return { id_loja: texto(l.id_loja, "id_loja"), nome: texto(l.nome, "nome") };
      }),
      canais: lista(opcoes.canais, "opcoes.canais").map((v, i) => opcao(v, `opcoes.canais[${i}]`)),
      categorias: lista(opcoes.categorias, "opcoes.categorias").map((v, i) =>
        opcao(v, `opcoes.categorias[${i}]`),
      ),
    },
    escopo: {
      papel: texto(escopo.papel, "escopo.papel"),
      id_loja: textoOuNulo(escopo.id_loja, "escopo.id_loja"),
      pode_escolher_loja: escopo.pode_escolher_loja === true,
    },
  };
}

function itemFila(valor: unknown, i: number): ItemFila {
  const o = objeto(valor, `itens[${i}]`);
  return {
    id_atendimento: texto(o.id_atendimento, "id_atendimento"),
    assunto: texto(o.assunto, "assunto"),
    cliente_nome: texto(o.cliente_nome, "cliente_nome"),
    canal_codigo: texto(o.canal_codigo, "canal_codigo"),
    canal: texto(o.canal, "canal"),
    categoria_codigo: texto(o.categoria_codigo, "categoria_codigo"),
    categoria: texto(o.categoria, "categoria"),
    prioridade_codigo: texto(o.prioridade_codigo, "prioridade_codigo"),
    prioridade: texto(o.prioridade, "prioridade"),
    status_codigo: texto(o.status_codigo, "status_codigo"),
    status: texto(o.status, "status"),
    aberto_em: texto(o.aberto_em, "aberto_em"),
    id_loja: textoOuNulo(o.id_loja, "id_loja"),
    loja_nome: textoOuNulo(o.loja_nome, "loja_nome"),
    sem_resposta: o.sem_resposta === true,
  };
}

export function validarFila(dados: unknown): FilaAtendimento {
  const o = objeto(dados, "fila");
  return {
    total_aberto: numero(o.total_aberto, "total_aberto"),
    sem_resposta: numero(o.sem_resposta, "sem_resposta"),
    urgentes: numero(o.urgentes, "urgentes"),
    itens: lista(o.itens, "itens").map(itemFila),
  };
}

// ---------- Chamadas ----------

const filtros = (f: FiltrosDashboard) => ({
  id_loja: f.idLoja,
  canal: f.canal,
  categoria: f.categoria,
});

export const buscarDashboard = (f: FiltrosDashboard, opcoes?: OpcoesApi) =>
  api.get("/dashboard/atendimento", validarDashboard, { inicio: f.inicio, fim: f.fim, ...filtros(f) }, opcoes);

export const buscarFila = (f: FiltrosDashboard, limite = 20, opcoes?: OpcoesApi) =>
  api.get("/dashboard/atendimento/fila", validarFila, { ...filtros(f), limit: limite }, opcoes);
