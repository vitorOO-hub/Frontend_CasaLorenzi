import { api, type OpcoesApi } from "./api";
import {
  booleano,
  falha,
  lista,
  numero,
  objeto,
  opcao,
  texto,
  textoOuNulo,
  type Opcao,
} from "./validacao";

/** Tipos e chamadas da área de chamados do painel (espelham app/chamados/schemas.py do backend). */

const BASE = "/api/v1/painel/atendimentos";

export type Situacao = "abertos" | "aberto" | "em_andamento" | "resolvido" | "todos";
export type Responsavel = "todos" | "eu" | "fila";
export type PrioridadeFiltro = "baixa" | "media" | "alta" | "urgente";

export type OpcoesChamados = {
  status: Opcao[];
  canais: Opcao[];
  categorias: Opcao[];
  prioridades: Opcao[];
  lojas: { id_loja: string; nome: string }[];
};

export type ResumoChamados = {
  sem_resposta: number;
  em_andamento: number;
  prioridade_alta: number;
  resolvidos: number;
  na_fila: number;
  meus: number;
};

export type ItemChamado = {
  id_atendimento: string;
  protocolo: string;
  assunto: string;
  cliente_nome: string;
  categoria: Opcao;
  canal: Opcao;
  prioridade: Opcao;
  status: Opcao;
  id_loja: string | null;
  loja_nome: string | null;
  aberto_em: string;
  id_usuario_responsavel: string | null;
  responsavel_nome: string | null;
  sou_responsavel: boolean;
};

export type ListaChamados = { total: number; itens: ItemChamado[] };

export type DetalheChamado = ItemChamado & {
  cliente: {
    id_cliente: string;
    nome: string;
    email: string;
    telefone: string | null;
    cidade: string | null;
    cliente_desde: string;
  };
  pedido: { id_pedido: string; numero_pedido: string; status: string } | null;
  pecas: { nome: string; sku: string; cor: string; tamanho: string }[];
  anexos: { id_anexo: string; nome: string; caminho: string; criado_em: string }[];
  outros_chamados: { id_atendimento: string; protocolo: string; assunto: string; status: Opcao }[];
  /** Só gerente e admin recebem; para o atendente vem nulo. */
  compras_recentes: { id_pedido: string; numero_pedido: string; criado_em: string; valor_total: number }[] | null;
};

export type MensagemChamado = {
  id_mensagem: string;
  autor: "cliente" | "atendente";
  nome: string;
  texto: string;
  enviada_em: string;
};

export type FiltrosChamados = {
  situacao: Situacao;
  responsavel: Responsavel;
  prioridade?: PrioridadeFiltro;
  canal?: string;
  categoria?: string;
  idLoja?: string;
  limit: number;
  offset: number;
};

// ---------- Validação ----------

const opcoes = (valor: unknown, campo: string) => lista(valor, campo).map((v, i) => opcao(v, `${campo}[${i}]`));

export function validarOpcoes(dados: unknown): OpcoesChamados {
  const o = objeto(dados, "opcoes");
  return {
    status: opcoes(o.status, "status"),
    canais: opcoes(o.canais, "canais"),
    categorias: opcoes(o.categorias, "categorias"),
    prioridades: opcoes(o.prioridades, "prioridades"),
    lojas: lista(o.lojas, "lojas").map((v, i) => {
      const l = objeto(v, `lojas[${i}]`);
      return { id_loja: texto(l.id_loja, "id_loja"), nome: texto(l.nome, "nome") };
    }),
  };
}

export function validarResumo(dados: unknown): ResumoChamados {
  const o = objeto(dados, "resumo");
  return {
    sem_resposta: numero(o.sem_resposta, "sem_resposta"),
    em_andamento: numero(o.em_andamento, "em_andamento"),
    prioridade_alta: numero(o.prioridade_alta, "prioridade_alta"),
    resolvidos: numero(o.resolvidos, "resolvidos"),
    na_fila: numero(o.na_fila, "na_fila"),
    meus: numero(o.meus, "meus"),
  };
}

export function validarItem(dados: unknown): ItemChamado {
  const o = objeto(dados, "chamado");
  return {
    id_atendimento: texto(o.id_atendimento, "id_atendimento"),
    protocolo: texto(o.protocolo, "protocolo"),
    assunto: texto(o.assunto, "assunto"),
    cliente_nome: texto(o.cliente_nome, "cliente_nome"),
    categoria: opcao(o.categoria, "categoria"),
    canal: opcao(o.canal, "canal"),
    prioridade: opcao(o.prioridade, "prioridade"),
    status: opcao(o.status, "status"),
    id_loja: textoOuNulo(o.id_loja, "id_loja"),
    loja_nome: textoOuNulo(o.loja_nome, "loja_nome"),
    aberto_em: texto(o.aberto_em, "aberto_em"),
    id_usuario_responsavel: textoOuNulo(o.id_usuario_responsavel, "id_usuario_responsavel"),
    responsavel_nome: textoOuNulo(o.responsavel_nome, "responsavel_nome"),
    sou_responsavel: booleano(o.sou_responsavel, "sou_responsavel"),
  };
}

export function validarLista(dados: unknown): ListaChamados {
  const o = objeto(dados, "lista");
  return { total: numero(o.total, "total"), itens: lista(o.itens, "itens").map(validarItem) };
}

export function validarDetalhe(dados: unknown): DetalheChamado {
  const o = objeto(dados, "detalhe");
  const c = objeto(o.cliente, "cliente");
  const compras = o.compras_recentes;
  return {
    ...validarItem(dados),
    cliente: {
      id_cliente: texto(c.id_cliente, "id_cliente"),
      nome: texto(c.nome, "cliente.nome"),
      email: texto(c.email, "cliente.email"),
      telefone: textoOuNulo(c.telefone, "cliente.telefone"),
      cidade: textoOuNulo(c.cidade, "cliente.cidade"),
      cliente_desde: texto(c.cliente_desde, "cliente_desde"),
    },
    pedido:
      o.pedido === null
        ? null
        : (() => {
            const p = objeto(o.pedido, "pedido");
            return {
              id_pedido: texto(p.id_pedido, "id_pedido"),
              numero_pedido: texto(p.numero_pedido, "numero_pedido"),
              status: texto(p.status, "pedido.status"),
            };
          })(),
    pecas: lista(o.pecas, "pecas").map((v, i) => {
      const p = objeto(v, `pecas[${i}]`);
      return { nome: texto(p.nome, "nome"), sku: texto(p.sku, "sku"), cor: texto(p.cor, "cor"), tamanho: texto(p.tamanho, "tamanho") };
    }),
    anexos: lista(o.anexos, "anexos").map((v, i) => {
      const a = objeto(v, `anexos[${i}]`);
      return {
        id_anexo: texto(a.id_anexo, "id_anexo"),
        nome: texto(a.nome, "anexo.nome"),
        caminho: texto(a.caminho, "caminho"),
        criado_em: texto(a.criado_em, "criado_em"),
      };
    }),
    outros_chamados: lista(o.outros_chamados, "outros_chamados").map((v, i) => {
      const x = objeto(v, `outros_chamados[${i}]`);
      return {
        id_atendimento: texto(x.id_atendimento, "id_atendimento"),
        protocolo: texto(x.protocolo, "protocolo"),
        assunto: texto(x.assunto, "assunto"),
        status: opcao(x.status, "status"),
      };
    }),
    compras_recentes:
      compras === null || compras === undefined
        ? null
        : lista(compras, "compras_recentes").map((v, i) => {
            const k = objeto(v, `compras_recentes[${i}]`);
            // O Pydantic serializa Decimal como texto ("199.90"); aceita número também.
            const valor = typeof k.valor_total === "string" ? Number(k.valor_total) : k.valor_total;
            return {
              id_pedido: texto(k.id_pedido, "id_pedido"),
              numero_pedido: texto(k.numero_pedido, "numero_pedido"),
              criado_em: texto(k.criado_em, "criado_em"),
              valor_total: numero(valor, "valor_total"),
            };
          }),
  };
}

export function validarMensagem(dados: unknown): MensagemChamado {
  const o = objeto(dados, "mensagem");
  const autor = o.autor;
  if (autor !== "cliente" && autor !== "atendente") return falha("autor");
  return {
    id_mensagem: texto(o.id_mensagem, "id_mensagem"),
    autor,
    nome: texto(o.nome, "nome"),
    texto: texto(o.texto, "texto"),
    enviada_em: texto(o.enviada_em, "enviada_em"),
  };
}

export const validarMensagens = (dados: unknown) => lista(dados, "mensagens").map(validarMensagem);

// ---------- Chamadas ----------

export const buscarOpcoes = (idLoja?: string, o?: OpcoesApi) =>
  api.get(`${BASE}/opcoes`, validarOpcoes, { id_loja: idLoja }, o);

export const buscarResumo = (idLoja?: string, o?: OpcoesApi) =>
  api.get(`${BASE}/resumo`, validarResumo, { id_loja: idLoja }, o);

export const listarChamados = (f: FiltrosChamados, o?: OpcoesApi) =>
  api.get(
    BASE,
    validarLista,
    {
      situacao: f.situacao,
      responsavel: f.responsavel,
      prioridade: f.prioridade,
      canal: f.canal,
      categoria: f.categoria,
      id_loja: f.idLoja,
      limit: f.limit,
      offset: f.offset,
    },
    o,
  );

export const buscarChamado = (id: string, o?: OpcoesApi) => api.get(`${BASE}/${id}`, validarDetalhe, undefined, o);

export const buscarMensagens = (id: string, o?: OpcoesApi) =>
  api.get(`${BASE}/${id}/mensagens`, validarMensagens, undefined, o);

export const enviarMensagem = (id: string, textoDaMensagem: string, o?: OpcoesApi) =>
  api.post(`${BASE}/${id}/mensagens`, validarMensagem, { texto: textoDaMensagem }, o);

export const assumirChamado = (id: string, o?: OpcoesApi) => api.post(`${BASE}/${id}/assumir`, validarItem, undefined, o);

export const resolverChamado = (id: string, o?: OpcoesApi) => api.post(`${BASE}/${id}/resolver`, validarItem, undefined, o);
