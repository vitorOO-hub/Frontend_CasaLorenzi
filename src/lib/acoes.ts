/**
 * Ações da plataforma: único caminho das telas para mudar dados.
 *
 * Todas são assíncronas e podem falhar com ErroApi, como as chamadas ao backend. Quem executa
 * vem da sessão (nunca de parâmetro), como o FastAPI lê papel e loja do token. No modo
 * simulado, as regras do briefing são conferidas aqui antes de mexer na store:
 * 403 para papel ou loja sem acesso, 409 para estado que não permite, 422 para dado inválido.
 */
import { ErroApi } from "@/api/erros";
import { MOTIVOS_CHAMADO, type MotivoChamado, type Papel } from "@/api/tipos";
import { usandoApi } from "@/api/config";
import {
  adicionarItemCarrinhoCliente,
  atualizarItemCarrinhoCliente,
  limparCarrinhoCliente,
  obterCarrinhoCliente,
  removerItemCarrinhoCliente,
  type CarrinhoClienteApi,
} from "./carrinhoClienteApi";
import { nomeLoja, type Chamado, type Pedido, type Usuario } from "./dados";
import { lojaDoPapel, sessaoAtual } from "./sessao";
import * as store from "./store";

// ---------- Quem está executando ----------

type Interno = { papel: Papel; nome: string; loja: string | null };

function interno(...papeis: Papel[]): Interno {
  const s = sessaoAtual();
  if (!s) throw new ErroApi("nao_autenticado");
  if (s.tipo !== "interno" || (papeis.length && !papeis.includes(s.papel))) throw new ErroApi("sem_permissao");
  return { papel: s.papel, nome: s.nome, loja: lojaDoPapel(s.papel) };
}

function cliente() {
  const s = sessaoAtual();
  if (!s) throw new ErroApi("nao_autenticado");
  if (s.tipo !== "cliente") throw new ErroApi("sem_permissao");
  return { id: s.clienteId, nome: s.nome };
}

/** Operador e gerente só mexem na própria loja; admin (loja nula) em qualquer uma. */
function exigirLoja(quem: Interno, ...lojas: (string | null)[]) {
  if (quem.loja && !lojas.includes(quem.loja)) {
    throw new ErroApi("sem_permissao", `Seu acesso é só à loja ${nomeLoja(quem.loja)}.`);
  }
}

const ESTOQUE: Papel[] = ["operador_estoque", "gerente_loja", "admin"];
const GESTAO: Papel[] = ["gerente_loja", "admin"];
const ATENDIMENTO: Papel[] = ["atendente", "gerente_loja", "admin"];

const estado = () => store.estadoAtual();

function produto(sku: string) {
  const p = estado().produtos.find((x) => x.sku === sku);
  if (!p) throw new ErroApi("nao_encontrado", "Peça não encontrada no catálogo.");
  return p;
}

const saldoEm = (sku: string, lojaId: string) => produto(sku).saldos.find((s) => s.lojaId === lojaId)?.quantidade ?? 0;

function inteiroPositivo(n: number, campo = "A quantidade") {
  if (!Number.isInteger(n) || n <= 0) throw new ErroApi("validacao", `${campo} precisa ser um número inteiro maior que zero.`);
}

function texto(valor: string, campo: string, min = 1, max = 500) {
  const t = valor.trim();
  if (t.length < min) throw new ErroApi("validacao", `${campo} precisa ter pelo menos ${min} caracteres.`);
  if (t.length > max) throw new ErroApi("validacao", `${campo} pode ter no máximo ${max} caracteres.`);
  return t;
}

/** Dá à tela o mesmo ritmo de uma chamada de rede (estado "carregando" visível). */
const rede = () => new Promise((r) => setTimeout(r, 150));

// ===================== Estoque =====================

/** POST /movimentacoes — entrada ou saída com lastro físico; a saída exige saldo. */
export async function movimentar(dados: { sku: string; lojaId: string; tipo: "Entrada" | "Saída"; quantidade: number; observacao?: string }) {
  await rede();
  const quem = interno(...ESTOQUE);
  exigirLoja(quem, dados.lojaId);
  inteiroPositivo(dados.quantidade);
  const saldo = saldoEm(dados.sku, dados.lojaId);
  if (dados.tipo === "Saída" && dados.quantidade > saldo) {
    throw new ErroApi("conflito", `Saldo insuficiente: há ${saldo} em ${nomeLoja(dados.lojaId)}.`);
  }
  const sinal = dados.tipo === "Saída" ? -1 : 1;
  store.registrarMovimento(dados.sku, dados.lojaId, sinal * dados.quantidade, dados.tipo, quem.nome, dados.observacao);
}

/** POST /transferencias — operador/gerente precisam ser da origem ou do destino. */
export async function solicitarTransferencia(dados: { sku: string; origemId: string; destinoId: string; quantidade: number }) {
  await rede();
  const quem = interno(...ESTOQUE);
  if (dados.origemId === dados.destinoId) throw new ErroApi("validacao", "A loja de origem precisa ser diferente da de destino.");
  exigirLoja(quem, dados.origemId, dados.destinoId);
  inteiroPositivo(dados.quantidade);
  produto(dados.sku);
  store.solicitarTransferencia(dados.sku, dados.origemId, dados.destinoId, dados.quantidade, quem.nome);
}

function transferencia(id: string) {
  const t = estado().transferencias.find((x) => x.id === id);
  if (!t) throw new ErroApi("nao_encontrado", "Transferência não encontrada.");
  return t;
}

/** POST /transferencias/{id}/aceitar — a origem aceita e o saldo dela é debitado. */
export async function aceitarTransferencia(id: string) {
  await rede();
  const quem = interno(...ESTOQUE);
  const t = transferencia(id);
  exigirLoja(quem, t.origemId);
  if (t.status !== "Pendente") throw new ErroApi("conflito", `Esta transferência já está ${t.status.toLowerCase()}.`);
  const saldo = saldoEm(t.sku, t.origemId);
  if (saldo < t.quantidade) throw new ErroApi("conflito", `Saldo insuficiente: há ${saldo} em ${nomeLoja(t.origemId)}.`);
  store.aceitarTransferencia(id, quem.nome);
}

/** POST /transferencias/{id}/recusar */
export async function recusarTransferencia(id: string) {
  await rede();
  const quem = interno(...ESTOQUE);
  const t = transferencia(id);
  exigirLoja(quem, t.origemId);
  if (t.status !== "Pendente") throw new ErroApi("conflito", `Esta transferência já está ${t.status.toLowerCase()}.`);
  store.recusarTransferencia(id);
}

/** POST /transferencias/{id}/receber — o destino confirma a chegada e é creditado. */
export async function receberTransferencia(id: string) {
  await rede();
  const quem = interno(...ESTOQUE);
  const t = transferencia(id);
  exigirLoja(quem, t.destinoId);
  if (t.status !== "Aceita") throw new ErroApi("conflito", "Só dá para receber uma transferência já aceita pela origem.");
  store.confirmarRecebimento(id, quem.nome);
}

/** POST /reposicoes — destinatário nulo = qualquer loja da rede pode aceitar. */
export async function pedirReposicao(dados: { sku: string; lojaId: string; destinatarioId: string | null; quantidade: number }) {
  await rede();
  const quem = interno(...ESTOQUE);
  exigirLoja(quem, dados.lojaId);
  inteiroPositivo(dados.quantidade);
  produto(dados.sku);
  if (dados.destinatarioId === dados.lojaId) throw new ErroApi("validacao", "Peça a reposição para outra loja.");
  store.abrirReposicao(dados.sku, dados.lojaId, dados.destinatarioId, dados.quantidade, quem.nome);
}

function reposicao(id: string) {
  const r = estado().reposicoes.find((x) => x.id === id);
  if (!r) throw new ErroApi("nao_encontrado", "Pedido de reposição não encontrado.");
  if (r.status !== "Aberta") throw new ErroApi("conflito", `Este pedido já foi ${r.status === "Aceita" ? "aceito" : "recusado"}.`);
  return r;
}

/** POST /reposicoes/{id}/aceitar — gera a transferência da loja que atende para a solicitante. */
export async function aceitarReposicao(id: string, lojaQueAtende: string) {
  await rede();
  const quem = interno(...ESTOQUE);
  const r = reposicao(id);
  exigirLoja(quem, lojaQueAtende);
  if (lojaQueAtende === r.solicitanteLojaId) throw new ErroApi("validacao", "A loja que pediu não pode atender o próprio pedido.");
  if (r.destinatarioLojaId && r.destinatarioLojaId !== lojaQueAtende) throw new ErroApi("sem_permissao", "Este pedido foi feito para outra loja.");
  store.aceitarReposicao(id, lojaQueAtende, quem.nome);
}

/** POST /reposicoes/{id}/recusar */
export async function recusarReposicao(id: string) {
  await rede();
  const quem = interno(...ESTOQUE);
  const r = reposicao(id);
  if (r.destinatarioLojaId) exigirLoja(quem, r.destinatarioLojaId);
  store.recusarReposicao(id, quem.nome);
}

/**
 * POST /ajustes — o operador informa a quantidade contada (quantidade_proposta) e o motivo;
 * o saldo não muda até a gestão aprovar.
 */
export async function solicitarAjuste(dados: { sku: string; lojaId: string; quantidadeProposta: number; motivo: string }) {
  await rede();
  const quem = interno(...ESTOQUE);
  exigirLoja(quem, dados.lojaId);
  if (!Number.isInteger(dados.quantidadeProposta) || dados.quantidadeProposta < 0) {
    throw new ErroApi("validacao", "A quantidade contada precisa ser um número inteiro, zero ou maior.");
  }
  const motivo = texto(dados.motivo, "O motivo", 5);
  const diferenca = dados.quantidadeProposta - saldoEm(dados.sku, dados.lojaId);
  if (diferenca === 0) throw new ErroApi("validacao", "A quantidade contada é igual ao saldo do sistema.");
  store.solicitarAjuste(dados.sku, dados.lojaId, diferenca, motivo, quem.nome);
}

function ajustePendente(id: string, quem: Interno) {
  const a = estado().ajustes.find((x) => x.id === id);
  if (!a) throw new ErroApi("nao_encontrado", "Ajuste não encontrado.");
  exigirLoja(quem, a.lojaId);
  if (a.status !== "Pendente") throw new ErroApi("conflito", `Este ajuste já foi ${a.status.toLowerCase()}${a.decididoPor ? ` por ${a.decididoPor}` : ""}.`);
  return a;
}

/** POST /ajustes/{id}/aprovar — só gerente da loja ou admin; segunda decisão é 409. */
export async function aprovarAjuste(id: string) {
  await rede();
  const quem = interno(...GESTAO);
  const a = ajustePendente(id, quem);
  if (saldoEm(a.sku, a.lojaId) + a.quantidade < 0) throw new ErroApi("conflito", "O saldo mudou e o ajuste deixaria o estoque negativo.");
  store.aprovarAjuste(id, quem.nome);
}

/** POST /ajustes/{id}/recusar — recusa exige motivo. */
export async function recusarAjuste(id: string, motivoRecusa: string) {
  await rede();
  const quem = interno(...GESTAO);
  ajustePendente(id, quem);
  store.recusarAjuste(id, quem.nome, texto(motivoRecusa, "O motivo da recusa", 5));
}

/** PUT /estoque/minimos — gerente na própria loja, admin em qualquer uma; grava auditoria. */
export async function definirMinimos(lojaId: string, itens: { sku: string; minimo: number }[]) {
  await rede();
  const quem = interno(...GESTAO);
  exigirLoja(quem, lojaId);
  for (const i of itens) {
    if (!Number.isInteger(i.minimo) || i.minimo < 0) throw new ErroApi("validacao", "O mínimo precisa ser um número inteiro, zero ou maior.");
    produto(i.sku);
  }
  itens.forEach((i) => store.definirMinimo(i.sku, lojaId, i.minimo, quem.nome));
}

// ===================== Atendimento =====================

function chamado(id: string) {
  const c = estado().chamados.find((x) => x.id === id);
  if (!c) throw new ErroApi("nao_encontrado", "Chamado não encontrado.");
  return c;
}

/** POST /chamados — o cliente abre com contexto de pedido; o pedido precisa ser dele. */
export async function abrirChamado(dados: {
  assunto: string;
  motivo: MotivoChamado;
  descricao: string;
  pedidoId?: string;
  sku?: string;
  lojaId?: string;
  anexos?: string[];
}): Promise<Chamado> {
  await rede();
  const eu = cliente();
  if (!MOTIVOS_CHAMADO.includes(dados.motivo)) throw new ErroApi("validacao", "Escolha o motivo do contato.");
  let lojaId = dados.lojaId ?? "l1";
  if (dados.pedidoId) {
    const pedido = estado().pedidos.find((p) => p.id === dados.pedidoId);
    if (!pedido || pedido.clienteId !== eu.id) throw new ErroApi("nao_encontrado", "Pedido não encontrado na sua conta.");
    lojaId = pedido.lojaId;
  }
  return store.abrirChamado({
    clienteId: eu.id,
    nomeCliente: eu.nome,
    assunto: texto(dados.assunto, "O assunto", 3, 120),
    motivo: dados.motivo,
    descricao: texto(dados.descricao, "A mensagem", 5, 2000),
    lojaId,
    pedidoId: dados.pedidoId,
    sku: dados.sku,
    anexos: dados.anexos,
  });
}

/** POST /chamados/{id}/assumir — 409 se outro atendente pegou primeiro. */
export async function assumirChamado(id: string) {
  await rede();
  const quem = interno(...ATENDIMENTO);
  const c = chamado(id);
  if (quem.papel === "gerente_loja") exigirLoja(quem, c.lojaId);
  if (c.atendente) throw new ErroApi("conflito", `${c.atendente === quem.nome ? "Você" : c.atendente} já assumiu este chamado.`);
  if (c.status === "Resolvido") throw new ErroApi("conflito", "Este chamado já foi resolvido.");
  store.assumirChamado(id, quem.nome);
}

/** POST /chamados/{id}/resolver — libera o convite de avaliação para o cliente. */
export async function resolverChamado(id: string) {
  await rede();
  const quem = interno(...ATENDIMENTO);
  const c = chamado(id);
  if (quem.papel === "gerente_loja") exigirLoja(quem, c.lojaId);
  if (c.status === "Resolvido") throw new ErroApi("conflito", "Este chamado já foi resolvido.");
  store.mudarStatus(id, "Resolvido");
}

/** Mensagem do chamado (vai direto ao Supabase): o lado vem da sessão. */
export async function enviarMensagem(chamadoId: string, mensagem: string) {
  await rede();
  const c = chamado(chamadoId);
  const corpo = texto(mensagem, "A mensagem", 1, 2000);
  const s = sessaoAtual();
  if (!s) throw new ErroApi("nao_autenticado");
  if (s.tipo === "cliente") {
    if (c.clienteId !== s.clienteId) throw new ErroApi("nao_encontrado", "Chamado não encontrado.");
    if (c.status === "Resolvido") throw new ErroApi("conflito", "Esta conversa foi encerrada. Abra um novo contato.");
    store.responderChamado(chamadoId, corpo, "cliente", s.nome);
    return;
  }
  const quem = interno(...ATENDIMENTO);
  store.responderChamado(chamadoId, corpo, "atendente", quem.nome);
}

// ===================== Compra =====================

const carrinhoApiLigado = () => usandoApi() && sessaoAtual()?.tipo === "cliente";

function aplicarCarrinhoApi(carrinho: CarrinhoClienteApi) {
  store.definirCarrinho(
    carrinho.itens.map((item) => ({
      idVariacao: item.id_variacao,
      sku: item.sku,
      skuBase: item.sku,
      nome: item.produto,
      quantidade: item.quantidade,
      valor: Number(item.preco_unitario),
      tamanho: item.tamanho,
      cor: item.cor,
      imagemUrl: item.imagem_url,
      imagemAlt: item.imagem_alt ?? item.produto,
      tecido: item.tecido,
    })),
  );
}

export async function sincronizarCarrinho() {
  if (!carrinhoApiLigado()) return;
  aplicarCarrinhoApi(await obterCarrinhoCliente());
}

export async function adicionarAoCarrinho(item: store.ItemCarrinho) {
  inteiroPositivo(item.quantidade);
  if (carrinhoApiLigado()) {
    if (!item.idVariacao) throw new ErroApi("validacao", "Atualize a peça pela loja antes de adicionar à sacola.");
    aplicarCarrinhoApi(await adicionarItemCarrinhoCliente({ id_variacao: item.idVariacao, quantidade: item.quantidade }));
    return;
  }
  store.adicionarAoCarrinho(item);
}

export async function alterarQuantidadeCarrinho(sku: string, quantidade: number) {
  if (!Number.isInteger(quantidade) || quantidade < 0) throw new ErroApi("validacao", "Quantidade inválida.");
  if (carrinhoApiLigado()) {
    const item = estado().carrinho.find((i) => i.sku === sku);
    if (!item?.idVariacao) throw new ErroApi("validacao", "Atualize a peça pela loja antes de alterar a sacola.");
    aplicarCarrinhoApi(
      quantidade === 0
        ? await removerItemCarrinhoCliente(item.idVariacao)
        : await atualizarItemCarrinhoCliente(item.idVariacao, quantidade),
    );
    return;
  }
  store.alterarQuantidadeCarrinho(sku, quantidade);
}

export async function limparCarrinho() {
  if (carrinhoApiLigado()) {
    aplicarCarrinhoApi(await limparCarrinhoCliente());
    return;
  }
  store.limparCarrinho();
}

const comprasFeitas = new Map<string, Pedido>();

/**
 * POST /pedidos — cria pedido, pagamento e debita o saldo da loja que separa, tudo junto.
 * A mesma chave de idempotência devolve o mesmo pedido (duplo clique não compra duas vezes).
 */
export async function fecharPedido(dados: { lojaId: string; frete: number }, chaveIdempotencia: string): Promise<Pedido> {
  await rede();
  const eu = cliente();
  const repetido = comprasFeitas.get(chaveIdempotencia);
  if (repetido) return repetido;
  const { carrinho } = estado();
  if (carrinho.length === 0) throw new ErroApi("validacao", "Sua sacola está vazia.");
  for (const item of carrinho) {
    const saldo = saldoEm(item.skuBase, dados.lojaId);
    if (saldo < item.quantidade) {
      throw new ErroApi("conflito", `${item.nome}: restam ${saldo} em ${nomeLoja(dados.lojaId)}. Ajuste a quantidade na sacola.`);
    }
  }
  const pedido = store.finalizarCompra(eu.id, dados.lojaId, dados.frete);
  if (!pedido) throw new ErroApi("servidor");
  comprasFeitas.set(chaveIdempotencia, pedido);
  return pedido;
}

// ===================== Admin =====================

export async function criarProduto(dados: { sku: string; nome: string; categoria: string; preco: number }) {
  await rede();
  const quem = interno("admin");
  const sku = texto(dados.sku, "O SKU", 3, 40).toUpperCase();
  if (estado().produtos.some((p) => p.sku === sku)) throw new ErroApi("conflito", `Já existe uma peça com o SKU ${sku}.`);
  if (!(dados.preco > 0)) throw new ErroApi("validacao", "O preço precisa ser maior que zero.");
  store.criarProduto({ sku, nome: texto(dados.nome, "O nome", 3, 120), categoria: texto(dados.categoria, "A categoria"), preco: dados.preco, autor: quem.nome });
}

export async function editarProduto(sku: string, dados: { nome: string; categoria: string; preco: number }) {
  await rede();
  const quem = interno("admin");
  produto(sku);
  if (!(dados.preco > 0)) throw new ErroApi("validacao", "O preço precisa ser maior que zero.");
  store.editarProduto(sku, { nome: texto(dados.nome, "O nome", 3, 120), categoria: texto(dados.categoria, "A categoria"), preco: dados.preco }, quem.nome);
}

/** DELETE /produtos/{id} — bloqueado se houver estoque ou pedido com a peça. */
export async function excluirProduto(sku: string) {
  await rede();
  const quem = interno("admin");
  const p = produto(sku);
  if (p.saldos.some((s) => s.quantidade > 0)) throw new ErroApi("conflito", "Esta peça ainda tem estoque. Zere o saldo ou desative a peça.");
  if (estado().pedidos.some((pd) => pd.itens.some((i) => i.sku.startsWith(sku)))) {
    throw new ErroApi("conflito", "Esta peça aparece em pedidos e não pode ser excluída. Desative a peça.");
  }
  store.excluirProduto(sku, quem.nome);
}

/** POST /usuarios — cria no Supabase Auth e em usuario_interno. */
export async function criarUsuario(dados: Omit<Usuario, "id" | "ativo">) {
  await rede();
  const quem = interno("admin");
  const email = texto(dados.email, "O e-mail", 5, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ErroApi("validacao", "Informe um e-mail válido.");
  if (estado().usuarios.some((u) => u.email === email)) throw new ErroApi("conflito", "Já existe um usuário com este e-mail.");
  if (dados.papel !== "admin" && !dados.lojaId) throw new ErroApi("validacao", "Escolha a loja do usuário.");
  store.criarUsuario({ ...dados, email, nome: texto(dados.nome, "O nome", 3, 120), lojaId: dados.papel === "admin" ? null : dados.lojaId }, quem.nome);
}

/** PATCH /usuarios/{id}/papel — vale para o usuário quando o token dele renovar. */
export async function alterarUsuario(id: string, dados: Partial<Pick<Usuario, "papel" | "lojaId" | "ativo">>) {
  await rede();
  const quem = interno("admin");
  const u = estado().usuarios.find((x) => x.id === id);
  if (!u) throw new ErroApi("nao_encontrado", "Usuário não encontrado.");
  const papel = dados.papel ?? u.papel;
  const lojaId = papel === "admin" ? null : (dados.lojaId !== undefined ? dados.lojaId : u.lojaId);
  if (papel !== "admin" && !lojaId) throw new ErroApi("validacao", "Escolha a loja do usuário.");
  store.atualizarUsuario(id, { ...dados, lojaId }, quem.nome);
}

/** POST/PUT /lojas — só admin, com auditoria. */
export async function salvarLoja(id: string | null, dados: { nome: string; cidade: string; endereco: string; responsavel: string }) {
  await rede();
  const quem = interno("admin");
  store.salvarLoja(
    id,
    {
      nome: texto(dados.nome, "O nome", 2, 80),
      cidade: texto(dados.cidade, "A cidade", 2, 80),
      endereco: texto(dados.endereco, "O endereço", 5, 200),
      responsavel: dados.responsavel.trim(),
    },
    quem.nome,
  );
}

// ===================== Integração =====================

/** PATCH /integracao/registros/{id}/mapear */
export async function mapearRegistro(codigoExterno: string, sku: string) {
  await rede();
  const quem = interno("admin");
  produto(sku);
  store.logAuditoria(quem.nome, "Mapeou registro de importação", `${codigoExterno} → ${sku}`);
}
