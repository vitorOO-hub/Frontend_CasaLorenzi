/**
 * O que o front faz direto no Supabase, protegido por RLS (seção 6, "sem FastAPI"):
 * catálogo público, carrinho, perfil e endereços do cliente, estoque e histórico da própria
 * loja, fila de chamados, mensagens (Realtime), anexos (Storage) e avaliação.
 *
 * Nada aqui grava em mais de uma tabela nem depende de estado: isso é do FastAPI (./backend.ts).
 * Toda listagem é paginada (limit padrão 20, máximo 100).
 */
import type { PostgrestError, RealtimeChannel } from "@supabase/supabase-js";
import { config } from "./config";
import { ErroApi, codigoDoStatus } from "./erros";
import { supabase } from "./supabase";
import {
  LIMITE_MAXIMO,
  LIMITE_PADRAO,
  type AnexoLer,
  type AvaliacaoCriar,
  type ChamadoLer,
  type ClienteLer,
  type EnderecoCriar,
  type EnderecoLer,
  type EstoqueLer,
  type Id,
  type ItemCarrinhoLer,
  type MensagemCriar,
  type MensagemLer,
  type MovimentacaoLer,
  type Pagina,
  type Paginacao,
  type PedidoLer,
  type ProdutoLer,
  type StatusChamado,
} from "./tipos";

/** Nomes das tabelas do schema (seção 4). Se o SQL final mudar algum, ajuste só aqui. */
export const TABELAS = {
  loja: "loja",
  produto: "produto",
  variacao: "variacao_produto",
  estoque: "estoque",
  movimentacao: "movimentacao_estoque",
  carrinho: "carrinho_compra",
  itemCarrinho: "item_carrinho",
  pedido: "pedido",
  cliente: "cliente",
  endereco: "endereco_entrega",
  atendimento: "atendimento",
  mensagem: "mensagem",
  anexo: "chamado_anexo",
  avaliacao: "avaliacao_atendimento",
} as const;

/** Anexo de chamado: tipos e tamanho aceitos antes de subir para o Storage. */
export const ANEXO_TIPOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const ANEXO_TAMANHO_MAXIMO = 5 * 1024 * 1024;

function falhou(erro: PostgrestError | null, status?: number): never | void {
  if (!erro) return;
  // RLS que barra uma escrita chega como 401/403; violação de unicidade como 409.
  const codigo = erro.code === "23505" ? "conflito" : codigoDoStatus(status ?? 500);
  throw new ErroApi(codigo, codigo === "servidor" ? undefined : erro.message, status ?? 0);
}

function faixa({ limit = LIMITE_PADRAO, offset = 0 }: Paginacao = {}) {
  const l = Math.min(Math.max(1, limit), LIMITE_MAXIMO);
  return { limit: l, offset: Math.max(0, offset), ate: Math.max(0, offset) + l - 1 };
}

// ---------- Catálogo público (anon, só produtos ativos) ----------

export async function listarProdutos(
  filtro: { categoria?: string; busca?: string } = {},
  pag?: Paginacao,
): Promise<Pagina<ProdutoLer>> {
  const f = faixa(pag);
  let q = supabase()
    .from(TABELAS.produto)
    .select(`*, variacoes:${TABELAS.variacao}(*)`, { count: "exact" })
    .eq("ativo", true)
    .order("nome")
    .range(f.offset, f.ate);
  if (filtro.categoria) q = q.eq("categoria", filtro.categoria);
  if (filtro.busca) q = q.ilike("nome", `%${filtro.busca}%`);
  const { data, error, count, status } = await q;
  falhou(error, status);
  return { itens: (data ?? []) as ProdutoLer[], total: count ?? 0, limit: f.limit, offset: f.offset };
}

export async function obterProduto(id: Id): Promise<ProdutoLer | null> {
  const { data, error, status } = await supabase()
    .from(TABELAS.produto)
    .select(`*, variacoes:${TABELAS.variacao}(*)`)
    .eq("id", id)
    .maybeSingle();
  falhou(error, status);
  return data as ProdutoLer | null;
}

// ---------- Carrinho do cliente ----------

async function idCarrinho(): Promise<Id> {
  const sb = supabase();
  const { data, error, status } = await sb.from(TABELAS.carrinho).select("id").maybeSingle();
  falhou(error, status);
  if (data) return data.id as Id;
  // id_cliente vem do auth.uid() por default/política no banco, nunca do front.
  const novo = await sb.from(TABELAS.carrinho).insert({}).select("id").single();
  falhou(novo.error, novo.status);
  return novo.data!.id as Id;
}

export async function listarCarrinho(): Promise<ItemCarrinhoLer[]> {
  const { data, error, status } = await supabase().from(TABELAS.itemCarrinho).select("id, id_variacao, quantidade").limit(LIMITE_MAXIMO);
  falhou(error, status);
  return (data ?? []) as ItemCarrinhoLer[];
}

export async function colocarNoCarrinho(id_variacao: Id, quantidade: number) {
  const id_carrinho = await idCarrinho();
  const { error, status } = await supabase()
    .from(TABELAS.itemCarrinho)
    .upsert({ id_carrinho, id_variacao, quantidade }, { onConflict: "id_carrinho,id_variacao" });
  falhou(error, status);
}

export async function tirarDoCarrinho(idItem: Id) {
  const { error, status } = await supabase().from(TABELAS.itemCarrinho).delete().eq("id", idItem);
  falhou(error, status);
}

// ---------- Perfil e endereços do cliente ----------

export async function meuPerfil(): Promise<ClienteLer | null> {
  const { data, error, status } = await supabase().from(TABELAS.cliente).select("*").maybeSingle();
  falhou(error, status);
  return data as ClienteLer | null;
}

export async function atualizarPerfil(dados: Partial<Pick<ClienteLer, "nome" | "telefone">>) {
  const { data: u } = await supabase().auth.getUser();
  const { error, status } = await supabase().from(TABELAS.cliente).update(dados).eq("id", u.user?.id ?? "");
  falhou(error, status);
}

export async function meusEnderecos(): Promise<EnderecoLer[]> {
  const { data, error, status } = await supabase().from(TABELAS.endereco).select("*").order("principal", { ascending: false }).limit(LIMITE_MAXIMO);
  falhou(error, status);
  return (data ?? []) as EnderecoLer[];
}

export async function salvarEndereco(dados: EnderecoCriar, id?: Id): Promise<EnderecoLer> {
  const tabela = supabase().from(TABELAS.endereco);
  const { data, error, status } = await (id ? tabela.update(dados).eq("id", id) : tabela.insert(dados)).select("*").single();
  falhou(error, status);
  return data as EnderecoLer;
}

export async function meusPedidos(pag?: Paginacao): Promise<Pagina<PedidoLer>> {
  const f = faixa(pag);
  const { data, error, count, status } = await supabase()
    .from(TABELAS.pedido)
    .select("*, itens:item_pedido(*), pagamento(*), entrega(*)", { count: "exact" })
    .order("criado_em", { ascending: false })
    .range(f.offset, f.ate);
  falhou(error, status);
  return { itens: (data ?? []) as PedidoLer[], total: count ?? 0, limit: f.limit, offset: f.offset };
}

// ---------- Estoque e histórico da própria loja ----------

export async function saldos(filtro: { id_loja?: Id; id_variacao?: Id } = {}, pag?: Paginacao): Promise<Pagina<EstoqueLer>> {
  const f = faixa(pag);
  let q = supabase().from(TABELAS.estoque).select("*", { count: "exact" }).range(f.offset, f.ate);
  if (filtro.id_loja) q = q.eq("id_loja", filtro.id_loja);
  if (filtro.id_variacao) q = q.eq("id_variacao", filtro.id_variacao);
  const { data, error, count, status } = await q;
  falhou(error, status);
  return { itens: (data ?? []) as EstoqueLer[], total: count ?? 0, limit: f.limit, offset: f.offset };
}

export async function historicoEstoque(filtro: { id_loja?: Id; id_variacao?: Id } = {}, pag?: Paginacao): Promise<Pagina<MovimentacaoLer>> {
  const f = faixa(pag);
  let q = supabase()
    .from(TABELAS.movimentacao)
    .select("*", { count: "exact" })
    .order("criado_em", { ascending: false })
    .range(f.offset, f.ate);
  if (filtro.id_loja) q = q.eq("id_loja", filtro.id_loja);
  if (filtro.id_variacao) q = q.eq("id_variacao", filtro.id_variacao);
  const { data, error, count, status } = await q;
  falhou(error, status);
  return { itens: (data ?? []) as MovimentacaoLer[], total: count ?? 0, limit: f.limit, offset: f.offset };
}

// ---------- Atendimento ----------

export async function filaChamados(filtro: { status?: StatusChamado; id_loja?: Id } = {}, pag?: Paginacao): Promise<Pagina<ChamadoLer>> {
  const f = faixa(pag);
  let q = supabase()
    .from(TABELAS.atendimento)
    .select("*", { count: "exact" })
    .order("criado_em", { ascending: true })
    .range(f.offset, f.ate);
  if (filtro.status) q = q.eq("status", filtro.status);
  if (filtro.id_loja) q = q.eq("id_loja", filtro.id_loja);
  const { data, error, count, status } = await q;
  falhou(error, status);
  return { itens: (data ?? []) as ChamadoLer[], total: count ?? 0, limit: f.limit, offset: f.offset };
}

export async function mensagens(idAtendimento: Id, pag?: Paginacao): Promise<Pagina<MensagemLer>> {
  const f = faixa({ limit: LIMITE_MAXIMO, ...pag });
  const { data, error, count, status } = await supabase()
    .from(TABELAS.mensagem)
    .select("*", { count: "exact" })
    .eq("id_atendimento", idAtendimento)
    .order("criado_em")
    .range(f.offset, f.ate);
  falhou(error, status);
  return { itens: (data ?? []) as MensagemLer[], total: count ?? 0, limit: f.limit, offset: f.offset };
}

/** Insere a mensagem; autor e horário vêm do banco (auth.uid() e default now()). */
export async function enviarMensagem(dados: MensagemCriar): Promise<MensagemLer> {
  const { data, error, status } = await supabase().from(TABELAS.mensagem).insert(dados).select("*").single();
  falhou(error, status);
  return data as MensagemLer;
}

/** Mensagens novas do chamado em tempo real (Supabase Realtime). Devolve a função para sair. */
export function ouvirMensagens(idAtendimento: Id, aoChegar: (m: MensagemLer) => void): () => void {
  const canal: RealtimeChannel = supabase()
    .channel(`mensagens-${idAtendimento}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: TABELAS.mensagem, filter: `id_atendimento=eq.${idAtendimento}` },
      (evento) => aoChegar(evento.new as MensagemLer),
    )
    .subscribe();
  return () => void supabase().removeChannel(canal);
}

/** Sobe o arquivo ao Storage e guarda só o caminho em chamado_anexo. */
export async function anexarArquivo(idAtendimento: Id, arquivo: File): Promise<AnexoLer> {
  if (!ANEXO_TIPOS.includes(arquivo.type)) throw new ErroApi("validacao", "Envie uma foto (JPG, PNG ou WebP) ou um PDF.");
  if (arquivo.size > ANEXO_TAMANHO_MAXIMO) throw new ErroApi("validacao", "O arquivo passa de 5 MB.");
  const caminho = `${idAtendimento}/${crypto.randomUUID()}-${arquivo.name.replace(/[^\w.-]+/g, "_")}`;
  const envio = await supabase().storage.from(config.bucketAnexos).upload(caminho, arquivo, { contentType: arquivo.type });
  if (envio.error) throw new ErroApi("servidor");
  const { data, error, status } = await supabase()
    .from(TABELAS.anexo)
    .insert({ id_atendimento: idAtendimento, caminho, nome: arquivo.name })
    .select("*")
    .single();
  falhou(error, status);
  return data as AnexoLer;
}

/** Link temporário para abrir um anexo privado. */
export async function linkDoAnexo(caminho: string, segundos = 300): Promise<string> {
  const { data, error } = await supabase().storage.from(config.bucketAnexos).createSignedUrl(caminho, segundos);
  if (error || !data) throw new ErroApi("nao_encontrado");
  return data.signedUrl;
}

/** Uma por atendimento (UNIQUE): segunda tentativa vira 409. */
export async function avaliar(dados: AvaliacaoCriar) {
  const { error, status } = await supabase().from(TABELAS.avaliacao).insert(dados);
  falhou(error, status);
}
