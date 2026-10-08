import { api, type OpcoesApi } from "./api";
import { lista, numero, numeroOuNulo, objeto, opcao, texto, textoOuNulo, type Opcao } from "./validacao";
import type { PecaMaisVendida, ResumoVendas, VendaDia } from "./gerenciaApi";

/** Tipos e chamada do início do admin (espelham `DashboardRede` em app/gerencia/schemas.py). */

const BASE = "/api/v1/painel/gerencia";

export type GrupoDaRede = {
  /** "rede" ou o id da loja. */
  id: string;
  nome: string;
  id_loja: string | null;
  serie_diaria: VendaDia[];
  categorias: { categoria: string; faturamento: number }[];
  motivos: { codigo: string; nome: string; total: number }[];
};

export type ResumoAtendimento = {
  total: number;
  resolvidos: number;
  taxa_resolucao: number;
  resposta_media_horas: number | null;
};

export type UnidadeDaRede = {
  id_loja: string;
  codigo: string;
  nome: string;
  cidade: string | null;
  faturamento: number;
  faturamento_anterior: number;
  pedidos: number;
  ticket_medio: number;
  participacao_online: number;
  unidades_em_estoque: number;
  pecas_esgotadas: number;
  chamados_abertos: number;
  resposta_media_horas: number | null;
};

export type DashboardRede = {
  periodo: { inicio: string; fim: string };
  periodo_anterior: { inicio: string; fim: string };
  atual: ResumoVendas;
  anterior: ResumoVendas;
  grupos: GrupoDaRede[];
  pecas_mais_vendidas: PecaMaisVendida[];
  atendimento: { atual: ResumoAtendimento; anterior: ResumoAtendimento; abertos_agora: number };
  estoque: { unidades: number; pecas: number; pecas_esgotadas: number };
  unidades: UnidadeDaRede[];
  opcoes: { lojas: { id_loja: string; nome: string }[]; canais: Opcao[]; categorias: string[] };
};

export type FiltrosRede = {
  inicio: string;
  fim: string;
  idsLoja?: string[];
  categoria?: string;
  canal?: string;
};

function resumoVendas(valor: unknown, campo: string): ResumoVendas {
  const o = objeto(valor, campo);
  return {
    faturamento: numero(o.faturamento, `${campo}.faturamento`),
    pedidos: numero(o.pedidos, `${campo}.pedidos`),
    pecas: numero(o.pecas, `${campo}.pecas`),
    ticket_medio: numero(o.ticket_medio, `${campo}.ticket_medio`),
    faturamento_online: numero(o.faturamento_online, `${campo}.faturamento_online`),
    pedidos_online: numero(o.pedidos_online, `${campo}.pedidos_online`),
    participacao_online: numero(o.participacao_online, `${campo}.participacao_online`),
  };
}

function resumoAtendimento(valor: unknown, campo: string): ResumoAtendimento {
  const o = objeto(valor, campo);
  return {
    total: numero(o.total, `${campo}.total`),
    resolvidos: numero(o.resolvidos, `${campo}.resolvidos`),
    taxa_resolucao: numero(o.taxa_resolucao, `${campo}.taxa_resolucao`),
    resposta_media_horas: numeroOuNulo(o.resposta_media_horas, `${campo}.resposta_media_horas`),
  };
}

function periodo(valor: unknown, campo: string) {
  const o = objeto(valor, campo);
  return { inicio: texto(o.inicio, `${campo}.inicio`), fim: texto(o.fim, `${campo}.fim`) };
}

export function validarDashboardRede(dados: unknown): DashboardRede {
  const o = objeto(dados, "rede");
  const opcoes = objeto(o.opcoes, "opcoes");
  const atendimento = objeto(o.atendimento, "atendimento");
  const estoque = objeto(o.estoque, "estoque");
  return {
    periodo: periodo(o.periodo, "periodo"),
    periodo_anterior: periodo(o.periodo_anterior, "periodo_anterior"),
    atual: resumoVendas(o.atual, "atual"),
    anterior: resumoVendas(o.anterior, "anterior"),
    grupos: lista(o.grupos, "grupos").map((v, i) => {
      const g = objeto(v, `grupos[${i}]`);
      return {
        id: texto(g.id, "id"),
        nome: texto(g.nome, "nome"),
        id_loja: textoOuNulo(g.id_loja, "id_loja"),
        serie_diaria: lista(g.serie_diaria, "serie_diaria").map((p, j) => {
          const d = objeto(p, `serie_diaria[${j}]`);
          return {
            data: texto(d.data, "data"),
            faturamento: numero(d.faturamento, "faturamento"),
            pedidos: numero(d.pedidos, "pedidos"),
            pecas: numero(d.pecas, "pecas"),
          };
        }),
        categorias: lista(g.categorias, "categorias").map((p, j) => {
          const c = objeto(p, `categorias[${j}]`);
          return { categoria: texto(c.categoria, "categoria"), faturamento: numero(c.faturamento, "faturamento") };
        }),
        motivos: lista(g.motivos, "motivos").map((p, j) => {
          const m = objeto(p, `motivos[${j}]`);
          return { codigo: texto(m.codigo, "codigo"), nome: texto(m.nome, "nome"), total: numero(m.total, "total") };
        }),
      };
    }),
    pecas_mais_vendidas: lista(o.pecas_mais_vendidas, "pecas_mais_vendidas").map((v, i) => {
      const p = objeto(v, `pecas_mais_vendidas[${i}]`);
      return {
        id_produto: texto(p.id_produto, "id_produto"),
        nome: texto(p.nome, "nome"),
        categoria: textoOuNulo(p.categoria, "categoria"),
        unidades: numero(p.unidades, "unidades"),
        faturamento: numero(p.faturamento, "faturamento"),
      };
    }),
    atendimento: {
      atual: resumoAtendimento(atendimento.atual, "atendimento.atual"),
      anterior: resumoAtendimento(atendimento.anterior, "atendimento.anterior"),
      abertos_agora: numero(atendimento.abertos_agora, "atendimento.abertos_agora"),
    },
    estoque: {
      unidades: numero(estoque.unidades, "estoque.unidades"),
      pecas: numero(estoque.pecas, "estoque.pecas"),
      pecas_esgotadas: numero(estoque.pecas_esgotadas, "estoque.pecas_esgotadas"),
    },
    unidades: lista(o.unidades, "unidades").map((v, i) => {
      const u = objeto(v, `unidades[${i}]`);
      return {
        id_loja: texto(u.id_loja, "id_loja"),
        codigo: texto(u.codigo, "codigo"),
        nome: texto(u.nome, "nome"),
        cidade: textoOuNulo(u.cidade, "cidade"),
        faturamento: numero(u.faturamento, "faturamento"),
        faturamento_anterior: numero(u.faturamento_anterior, "faturamento_anterior"),
        pedidos: numero(u.pedidos, "pedidos"),
        ticket_medio: numero(u.ticket_medio, "ticket_medio"),
        participacao_online: numero(u.participacao_online, "participacao_online"),
        unidades_em_estoque: numero(u.unidades_em_estoque, "unidades_em_estoque"),
        pecas_esgotadas: numero(u.pecas_esgotadas, "pecas_esgotadas"),
        chamados_abertos: numero(u.chamados_abertos, "chamados_abertos"),
        resposta_media_horas: numeroOuNulo(u.resposta_media_horas, "resposta_media_horas"),
      };
    }),
    opcoes: {
      lojas: lista(opcoes.lojas, "opcoes.lojas").map((v, i) => {
        const l = objeto(v, `opcoes.lojas[${i}]`);
        return { id_loja: texto(l.id_loja, "id_loja"), nome: texto(l.nome, "nome") };
      }),
      canais: lista(opcoes.canais, "opcoes.canais").map((v, i) => opcao(v, `opcoes.canais[${i}]`)),
      categorias: lista(opcoes.categorias, "opcoes.categorias").map((v, i) => texto(v, `opcoes.categorias[${i}]`)),
    },
  };
}

export const buscarDashboardRede = (f: FiltrosRede, o?: OpcoesApi) =>
  api.get(
    `${BASE}/rede`,
    validarDashboardRede,
    { inicio: f.inicio, fim: f.fim, ids_loja: f.idsLoja, categoria: f.categoria, canal: f.canal },
    o,
  );
