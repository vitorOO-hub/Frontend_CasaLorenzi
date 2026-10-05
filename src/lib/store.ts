import { useSyncExternalStore } from "react";
import {
  ajustesIniciais,
  auditoriaInicial,
  chamadosIniciais,
  lojas,
  pedidosIniciais,
  produtosIniciais,
  reposicoesIniciais,
  transferenciasIniciais,
  usuariosIniciais,
  type Auditoria,
  type Chamado,
  type ItemPedido,
  type Pedido,
  type Produto,
  type SolicitacaoAjuste,
  type SolicitacaoReposicao,
  type SolicitacaoTransferencia,
  type StatusChamado,
  type Usuario,
} from "./dados";

export type ItemCarrinho = ItemPedido & { skuBase: string; tamanho: string; cor: string };

type Estado = {
  produtos: Produto[];
  chamados: Chamado[];
  transferencias: SolicitacaoTransferencia[];
  ajustes: SolicitacaoAjuste[];
  reposicoes: SolicitacaoReposicao[];
  pedidos: Pedido[];
  usuarios: Usuario[];
  auditoria: Auditoria[];
  carrinho: ItemCarrinho[];
};

const clone = <T extends object>(lista: T[]) => lista.map((x) => ({ ...x }));

const estado: Estado = {
  produtos: produtosIniciais.map((p) => ({
    ...p,
    saldos: clone(p.saldos),
    movimentacoes: [...p.movimentacoes],
  })),
  chamados: clone(chamadosIniciais),
  transferencias: clone(transferenciasIniciais),
  ajustes: clone(ajustesIniciais),
  reposicoes: clone(reposicoesIniciais),
  pedidos: clone(pedidosIniciais),
  usuarios: clone(usuariosIniciais),
  auditoria: clone(auditoriaInicial),
  carrinho: [],
};

let versao = 0;
const ouvintes = new Set<() => void>();

function notificar() {
  versao += 1;
  ouvintes.forEach((fn) => fn());
}

/** Estado global do protótipo; o componente re-renderiza a cada alteração. */
export function useEstado(): Estado {
  useSyncExternalStore(
    (fn) => {
      ouvintes.add(fn);
      return () => ouvintes.delete(fn);
    },
    () => versao,
  );
  return estado;
}

const hoje = () => new Date().toISOString().slice(0, 10);
const agora = () =>
  `${hoje()} ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
const novoId = (prefixo: string) => `${prefixo}-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;

function registrarAuditoria(autor: string, acao: string, detalhe: string) {
  estado.auditoria = [{ id: novoId("au"), data: hoje(), autor, acao, detalhe }, ...estado.auditoria];
}

export function logAuditoria(autor: string, acao: string, detalhe: string) {
  registrarAuditoria(autor, acao, detalhe);
  notificar();
}

const produtoDe = (sku: string) => estado.produtos.find((p) => p.sku === sku);

// ===================== Estoque =====================

export function registrarMovimento(
  sku: string,
  lojaId: string,
  quantidade: number,
  tipo: "Entrada" | "Saída",
  responsavel: string,
  observacao?: string,
) {
  const produto = produtoDe(sku);
  const saldo = produto?.saldos.find((s) => s.lojaId === lojaId);
  if (!produto || !saldo) return;
  saldo.quantidade = Math.max(0, saldo.quantidade + quantidade);
  produto.movimentacoes = [
    { id: novoId("mv"), data: hoje(), tipo, quantidade, lojaId, responsavel, observacao },
    ...produto.movimentacoes,
  ];
  notificar();
}

/** Cria a transferência; o saldo só muda quando a origem aceita e o destino recebe. */
export function solicitarTransferencia(
  sku: string,
  origemId: string,
  destinoId: string,
  quantidade: number,
  solicitante: string,
) {
  if (!produtoDe(sku) || origemId === destinoId || quantidade <= 0) return;
  estado.transferencias = [
    {
      id: novoId("tr"),
      sku,
      origemId,
      destinoId,
      quantidade,
      solicitante,
      data: hoje(),
      status: "Pendente",
    },
    ...estado.transferencias,
  ];
  notificar();
}

/** Loja de origem aceita enviar: debita a origem e a peça fica em trânsito. */
export function aceitarTransferencia(id: string, responsavel: string) {
  const t = estado.transferencias.find((x) => x.id === id);
  const produto = t && produtoDe(t.sku);
  const origem = t && produto?.saldos.find((s) => s.lojaId === t.origemId);
  if (!t || !produto || !origem || t.status !== "Pendente") return;
  const qtd = Math.min(t.quantidade, origem.quantidade);
  origem.quantidade -= qtd;
  t.quantidade = qtd;
  t.status = "Aceita";
  produto.movimentacoes = [
    {
      id: novoId("mv"),
      data: hoje(),
      tipo: "Transferência",
      quantidade: -qtd,
      lojaId: t.origemId,
      responsavel,
    },
    ...produto.movimentacoes,
  ];
  notificar();
}

export function recusarTransferencia(id: string) {
  const t = estado.transferencias.find((x) => x.id === id);
  if (!t || t.status !== "Pendente") return;
  t.status = "Recusada";
  notificar();
}

/** Loja de destino confirma a chegada: credita o destino. */
export function confirmarRecebimento(id: string, responsavel: string) {
  const t = estado.transferencias.find((x) => x.id === id);
  const produto = t && produtoDe(t.sku);
  const destino = t && produto?.saldos.find((s) => s.lojaId === t.destinoId);
  if (!t || !produto || !destino || t.status !== "Aceita") return;
  destino.quantidade += t.quantidade;
  t.status = "Recebida";
  produto.movimentacoes = [
    {
      id: novoId("mv"),
      data: hoje(),
      tipo: "Transferência",
      quantidade: t.quantidade,
      lojaId: t.destinoId,
      responsavel,
    },
    ...produto.movimentacoes,
  ];
  notificar();
}

/** Ajuste manual entra como pendente; só altera o saldo após aprovação da gestão. */
export function solicitarAjuste(
  sku: string,
  lojaId: string,
  quantidade: number,
  motivo: string,
  solicitante: string,
) {
  if (!produtoDe(sku) || quantidade === 0) return;
  estado.ajustes = [
    {
      id: novoId("aj"),
      sku,
      lojaId,
      quantidade,
      motivo,
      solicitante,
      data: hoje(),
      status: "Pendente",
    },
    ...estado.ajustes,
  ];
  notificar();
}

export function aprovarAjuste(id: string, aprovador: string) {
  const a = estado.ajustes.find((x) => x.id === id);
  const produto = a && produtoDe(a.sku);
  const saldo = a && produto?.saldos.find((s) => s.lojaId === a.lojaId);
  if (!a || !produto || !saldo || a.status !== "Pendente") return;
  saldo.quantidade = Math.max(0, saldo.quantidade + a.quantidade);
  a.status = "Aprovado";
  a.decididoPor = aprovador;
  produto.movimentacoes = [
    {
      id: novoId("mv"),
      data: hoje(),
      tipo: "Ajuste",
      quantidade: a.quantidade,
      lojaId: a.lojaId,
      responsavel: aprovador,
      observacao: `Solicitado por ${a.solicitante}: ${a.motivo}`,
    },
    ...produto.movimentacoes,
  ];
  registrarAuditoria(aprovador, "Aprovou ajuste manual", `${a.sku} · ${a.quantidade} un.`);
  notificar();
}

export function recusarAjuste(id: string, aprovador: string) {
  const a = estado.ajustes.find((x) => x.id === id);
  if (!a || a.status !== "Pendente") return;
  a.status = "Recusado";
  a.decididoPor = aprovador;
  registrarAuditoria(aprovador, "Recusou ajuste manual", `${a.sku} · ${a.quantidade} un.`);
  notificar();
}

export function definirMinimo(sku: string, lojaId: string, minimo: number, autor: string) {
  const saldo = produtoDe(sku)?.saldos.find((s) => s.lojaId === lojaId);
  if (!saldo) return;
  saldo.minimo = Math.max(0, minimo);
  registrarAuditoria(autor, "Definiu estoque mínimo", `${sku} · mínimo ${saldo.minimo}`);
  notificar();
}

export function abrirReposicao(
  sku: string,
  solicitanteLojaId: string,
  destinatarioLojaId: string | null,
  quantidade: number,
  solicitante: string,
) {
  if (quantidade <= 0) return;
  estado.reposicoes = [
    {
      id: novoId("rp"),
      sku,
      solicitanteLojaId,
      destinatarioLojaId,
      quantidade,
      solicitante,
      data: hoje(),
      status: "Aberta",
    },
    ...estado.reposicoes,
  ];
  notificar();
}

/** Aceitar um pedido de reposição gera a transferência correspondente. */
export function aceitarReposicao(id: string, minhaLojaId: string, responsavel: string) {
  const r = estado.reposicoes.find((x) => x.id === id);
  if (!r || r.status !== "Aberta") return;
  r.status = "Aceita";
  r.atendidaPor = responsavel;
  solicitarTransferencia(r.sku, minhaLojaId, r.solicitanteLojaId, r.quantidade, responsavel);
}

export function recusarReposicao(id: string, responsavel: string) {
  const r = estado.reposicoes.find((x) => x.id === id);
  if (!r || r.status !== "Aberta") return;
  r.status = "Recusada";
  r.atendidaPor = responsavel;
  notificar();
}

// ===================== Atendimento =====================

export function responderChamado(
  chamadoId: string,
  texto: string,
  autor: "cliente" | "atendente",
  nome: string,
) {
  const chamado = estado.chamados.find((c) => c.id === chamadoId);
  if (!chamado || !texto.trim()) return;
  chamado.mensagens = [
    ...chamado.mensagens,
    { id: novoId("m"), autor, nome, data: agora(), texto: texto.trim() },
  ];
  if (chamado.status === "Aberto" && autor === "atendente") chamado.status = "Em andamento";
  notificar();
}

export function mudarStatus(chamadoId: string, status: StatusChamado) {
  const chamado = estado.chamados.find((c) => c.id === chamadoId);
  if (!chamado) return;
  chamado.status = status;
  notificar();
}

let sequenciaChamado = 900;

export function abrirChamado(dados: {
  clienteId: string;
  nomeCliente: string;
  assunto: string;
  motivo: Chamado["motivo"];
  descricao: string;
  lojaId: string;
  pedidoId?: string;
  sku?: string;
  anexos?: string[];
}) {
  sequenciaChamado += 1;
  const novo: Chamado = {
    id: novoId("ch"),
    protocolo: `AT-2026-0${sequenciaChamado}`,
    clienteId: dados.clienteId,
    assunto: dados.assunto,
    motivo: dados.motivo,
    canal: "Portal",
    lojaId: dados.lojaId,
    pedidoId: dados.pedidoId,
    sku: dados.sku,
    anexos: dados.anexos?.map((nome, i) => ({
      id: novoId(`an${i}`),
      nome,
      descricao: "Foto enviada pelo cliente",
    })),
    status: "Aberto",
    abertoEm: hoje(),
    mensagens: [
      { id: "m1", autor: "cliente", nome: dados.nomeCliente, data: agora(), texto: dados.descricao },
    ],
  };
  estado.chamados = [novo, ...estado.chamados];
  notificar();
  return novo;
}

// ===================== Gestão =====================

export function criarProduto(dados: {
  sku: string;
  nome: string;
  categoria: string;
  preco: number;
  autor: string;
}) {
  if (produtoDe(dados.sku)) return;
  estado.produtos = [
    {
      sku: dados.sku,
      nome: dados.nome,
      categoria: dados.categoria,
      preco: dados.preco,
      saldos: lojas.map((l) => ({ lojaId: l.id, quantidade: 0, minimo: 4 })),
      movimentacoes: [],
    },
    ...estado.produtos,
  ];
  registrarAuditoria(dados.autor, "Criou produto no catálogo", `${dados.sku} · ${dados.nome}`);
  notificar();
}

export function editarProduto(
  sku: string,
  dados: { nome: string; categoria: string; preco: number },
  autor: string,
) {
  const produto = produtoDe(sku);
  if (!produto) return;
  Object.assign(produto, dados);
  registrarAuditoria(autor, "Editou produto do catálogo", `${sku} · ${dados.nome}`);
  notificar();
}

export function excluirProduto(sku: string, autor: string) {
  estado.produtos = estado.produtos.filter((p) => p.sku !== sku);
  registrarAuditoria(autor, "Excluiu produto do catálogo", sku);
  notificar();
}

export function criarUsuario(dados: Omit<Usuario, "id" | "ativo">, autor: string) {
  estado.usuarios = [{ id: novoId("u"), ativo: true, ...dados }, ...estado.usuarios];
  registrarAuditoria(autor, "Cadastrou usuário", `${dados.nome} · ${dados.papel}`);
  notificar();
}

export function atualizarUsuario(
  id: string,
  dados: Partial<Pick<Usuario, "papel" | "lojaId" | "ativo">>,
  autor: string,
) {
  const u = estado.usuarios.find((x) => x.id === id);
  if (!u) return;
  Object.assign(u, dados);
  registrarAuditoria(
    autor,
    dados.ativo === undefined ? "Alterou papel de usuário" : "Alterou acesso de usuário",
    `${u.nome} · ${u.papel}${u.ativo ? "" : " · inativo"}`,
  );
  notificar();
}

export function salvarLoja(
  id: string | null,
  dados: { nome: string; cidade: string; endereco: string; responsavel: string },
  autor: string,
) {
  if (id) {
    const loja = lojas.find((l) => l.id === id);
    if (!loja) return;
    Object.assign(loja, dados);
    registrarAuditoria(autor, "Editou loja", `${dados.nome} · ${dados.cidade}`);
  } else {
    const novo = novoId("l");
    lojas.push({ id: novo, ...dados });
    estado.produtos.forEach((p) => p.saldos.push({ lojaId: novo, quantidade: 0, minimo: 4 }));
    registrarAuditoria(autor, "Cadastrou loja", `${dados.nome} · ${dados.cidade}`);
  }
  notificar();
}

// ===================== Sacola e compra =====================

export function adicionarAoCarrinho(item: ItemCarrinho) {
  const existente = estado.carrinho.find((i) => i.sku === item.sku);
  if (existente) existente.quantidade += item.quantidade;
  else estado.carrinho = [...estado.carrinho, item];
  notificar();
}

export function alterarQuantidadeCarrinho(sku: string, quantidade: number) {
  if (quantidade <= 0) estado.carrinho = estado.carrinho.filter((i) => i.sku !== sku);
  else {
    const item = estado.carrinho.find((i) => i.sku === sku);
    if (item) item.quantidade = quantidade;
  }
  notificar();
}

let sequenciaPedido = 10500;

export function finalizarCompra(clienteId: string, lojaId: string): Pedido | null {
  if (estado.carrinho.length === 0) return null;
  sequenciaPedido += 1;
  const novo: Pedido = {
    id: `PD-${sequenciaPedido}`,
    clienteId,
    data: hoje(),
    valor: estado.carrinho.reduce((s, i) => s + i.valor * i.quantidade, 0),
    lojaId,
    status: "Separação",
    itens: estado.carrinho.map(({ sku, nome, quantidade, valor }) => ({
      sku,
      nome,
      quantidade,
      valor,
    })),
  };
  estado.pedidos = [novo, ...estado.pedidos];
  estado.carrinho = [];
  notificar();
  return novo;
}
