// Dados fictícios em memória. Nenhum backend: tudo vive na store em ./store.ts.

import type { Papel } from "@/api/tipos";

export type Loja = {
  id: string;
  nome: string;
  cidade: string;
  endereco: string;
  responsavel: string;
};

export type SaldoLoja = { lojaId: string; quantidade: number; minimo: number };

export type Movimentacao = {
  id: string;
  data: string;
  tipo: "Entrada" | "Saída" | "Ajuste" | "Transferência";
  quantidade: number;
  lojaId: string;
  responsavel: string;
  observacao?: string;
};

export type VariacaoProdutoCatalogo = {
  idVariacao?: string;
  sku: string;
  cor: string;
  tamanho: string;
  preco: number;
};

export type CorProdutoCatalogo = { nome: string; hex: string };

export type Produto = {
  sku: string;
  nome: string;
  categoria: string;
  preco: number;
  saldos: SaldoLoja[];
  movimentacoes: Movimentacao[];
  descricao?: string | null;
  variacoes?: VariacaoProdutoCatalogo[];
  imagemUrl?: string;
  imagemAlt?: string;
  imagemVestidaUrl?: string | null;
  tipo?: string;
  tecido?: string;
  tecelagem?: string;
  costuradoEm?: string;
  nota?: string;
  cores?: CorProdutoCatalogo[];
};

export type StatusTransferencia = "Pendente" | "Aceita" | "Recebida" | "Recusada";

export type SolicitacaoTransferencia = {
  id: string;
  sku: string;
  origemId: string;
  destinoId: string;
  quantidade: number;
  solicitante: string;
  data: string;
  status: StatusTransferencia;
};

export type StatusAjuste = "Pendente" | "Aprovado" | "Recusado";

export type SolicitacaoAjuste = {
  id: string;
  sku: string;
  lojaId: string;
  quantidade: number;
  motivo: string;
  solicitante: string;
  data: string;
  status: StatusAjuste;
  decididoPor?: string;
  motivoRecusa?: string;
};

export type StatusReposicao = "Aberta" | "Aceita" | "Recusada";

/** Pedido de reposição aberto por uma loja para outra (ou para a rede inteira). */
export type SolicitacaoReposicao = {
  id: string;
  sku: string;
  solicitanteLojaId: string;
  destinatarioLojaId: string | null; // null = aberto para a rede
  quantidade: number;
  solicitante: string;
  data: string;
  status: StatusReposicao;
  atendidaPor?: string;
};

export type Cliente = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  desde: string;
};

export type ItemPedido = {
  sku: string;
  nome: string;
  quantidade: number;
  valor: number;
  imagemUrl?: string | null;
  imagemAlt?: string | null;
  tecido?: string | null;
};

export type StatusPedido = "Entregue" | "Em transporte" | "Separação" | "Cancelado";

export type Pedido = {
  id: string;
  clienteId: string;
  data: string;
  valor: number;
  lojaId: string;
  status: StatusPedido;
  itens: ItemPedido[];
};

export type Mensagem = {
  id: string;
  autor: "cliente" | "atendente";
  nome: string;
  data: string;
  texto: string;
};

export type StatusChamado = "Aberto" | "Em andamento" | "Resolvido";
export type Prioridade = "Alta" | "Média" | "Baixa";
export type Anexo = { id: string; nome: string; descricao: string };

export type Chamado = {
  id: string;
  protocolo: string;
  clienteId: string;
  assunto: string;
  motivo: "Troca" | "Defeito" | "Entrega" | "Dúvida";
  canal: "WhatsApp" | "E-mail" | "Loja" | "Portal";
  lojaId: string;
  pedidoId?: string;
  sku?: string;
  prioridade?: Prioridade;
  atendente?: string; // vazio = na fila
  anexos?: Anexo[];
  status: StatusChamado;
  abertoEm: string;
  mensagens: Mensagem[];
};

/** Mesmos papéis do backend (enum do banco), definidos em src/api/tipos.ts. */
export type PapelUsuario = Papel;

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  papel: PapelUsuario;
  lojaId: string | null;
  ativo: boolean;
};

export type Auditoria = { id: string; data: string; autor: string; acao: string; detalhe: string };

export type LoteImportacao = {
  id: string;
  origem: string;
  registros: number;
  pendentes: number;
  status: "Pendente de mapeamento" | "Processado" | "Com erro";
  recebidoEm: string;
};

export type RegistroImportacao = {
  id: string;
  loteId: string;
  descricaoExterna: string;
  codigoExterno: string;
  skuMapeado: string | null;
};

// ===================== Lojas =====================

export const lojas: Loja[] = [
  {
    id: "l1",
    nome: "Shopping Ibirapuera",
    cidade: "São Paulo, SP",
    endereco: "Av. Ibirapuera, 3103 — Piso Moema",
    responsavel: "Marina Toledo",
  },
  {
    id: "l2",
    nome: "Barra",
    cidade: "Rio de Janeiro, RJ",
    endereco: "Av. das Américas, 4666 — BarraShopping",
    responsavel: "Rafael Queiroz",
  },
  {
    id: "l3",
    nome: "Savassi",
    cidade: "Belo Horizonte, MG",
    endereco: "Rua Pernambuco, 1000 — Savassi",
    responsavel: "Juliana Prado",
  },
];

export const nomeLoja = (id: string) => lojas.find((l) => l.id === id)?.nome ?? "—";

// ===================== Produtos =====================

const mov = (
  id: string,
  data: string,
  tipo: Movimentacao["tipo"],
  quantidade: number,
  lojaId: string,
  responsavel: string,
): Movimentacao => ({ id, data, tipo, quantidade, lojaId, responsavel });

function p(
  sku: string,
  nome: string,
  categoria: string,
  preco: number,
  q: [number, number, number],
  m: [number, number, number] = [4, 4, 4],
): Produto {
  return {
    sku,
    nome,
    categoria,
    preco,
    saldos: lojas.map((l, i) => ({ lojaId: l.id, quantidade: q[i] ?? 0, minimo: m[i] ?? 4 })),
    movimentacoes: [
      mov(`${sku}-m1`, "2026-08-28", "Entrada", 12, "l1", "Marina Toledo"),
      mov(`${sku}-m2`, "2026-08-25", "Saída", -3, "l2", "Rafael Queiroz"),
      mov(`${sku}-m3`, "2026-08-19", "Transferência", -5, "l3", "Juliana Prado"),
      mov(`${sku}-m4`, "2026-08-11", "Ajuste", 2, "l1", "Inventário mensal"),
    ],
  };
}

export const produtosIniciais: Produto[] = [
  p("CL-0101", "Camisa de Linho Ravena", "Camisaria", 389, [14, 9, 6]),
  p("CL-0102", "Camisa Oxford Bianca", "Camisaria", 329, [0, 0, 0]),
  p("CL-0203", "Calça Alfaiataria Torino", "Calças", 649, [8, 3, 11]),
  p("CL-0204", "Blazer Estruturado Modena", "Alfaiataria", 1290, [2, 1, 0], [5, 5, 5]),
  p("CL-0305", "Vestido Midi Amalfi", "Vestidos", 899, [7, 12, 5]),
  p("CL-0306", "Vestido Slip Verona", "Vestidos", 749, [0, 0, 0]),
  p("CL-0407", "Tricot Gola Alta Bolonha", "Malharia", 459, [21, 16, 9]),
  p("CL-0408", "Suéter Lã Merino Aosta", "Malharia", 689, [3, 2, 1], [6, 6, 6]),
  p("CL-0509", "Trench Coat Milano", "Outerwear", 1690, [4, 6, 3]),
  p("CL-0510", "Jaqueta Couro Firenze", "Outerwear", 2190, [5, 2, 4]),
  p("CL-0611", "Saia Plissada Como", "Saias", 529, [11, 8, 14]),
  p("CL-0712", "Bolsa Estruturada Lucca", "Acessórios", 1150, [6, 4, 7]),
  p("CL-0713", "Cinto Couro Siena", "Acessórios", 279, [18, 22, 13]),
  p("CL-0814", "Mocassim Pádua", "Calçados", 899, [9, 5, 8]),
  p("CL-0815", "Bota Chelsea Asolo", "Calçados", 1090, [6, 7, 2]),
];

// Movimentações registradas pelo operador da unidade Ibirapuera.
produtosIniciais[0]!.movimentacoes.unshift(
  mov("CL-0101-m0", "2026-09-01", "Entrada", 6, "l1", "Vinícius Prado"),
);
produtosIniciais[6]!.movimentacoes.unshift(
  mov("CL-0407-m0", "2026-08-30", "Saída", -2, "l1", "Vinícius Prado"),
);

/** Foto de catálogo da peça; peças cadastradas depois não têm foto. */
export const fotoProduto = (sku: string): string | undefined =>
  produtosIniciais.some((p) => p.sku === sku) ? `/img/produtos/${sku}.jpg` : undefined;

export const transferenciasIniciais: SolicitacaoTransferencia[] = [
  {
    id: "tr1",
    sku: "CL-0204",
    origemId: "l2",
    destinoId: "l1",
    quantidade: 2,
    solicitante: "Marina Toledo",
    data: "2026-09-02",
    status: "Pendente",
  },
  {
    id: "tr2",
    sku: "CL-0305",
    origemId: "l1",
    destinoId: "l3",
    quantidade: 3,
    solicitante: "Juliana Prado",
    data: "2026-09-01",
    status: "Aceita",
  },
  {
    id: "tr3",
    sku: "CL-0408",
    origemId: "l3",
    destinoId: "l1",
    quantidade: 2,
    solicitante: "Vinícius Prado",
    data: "2026-09-03",
    status: "Aceita",
  },
];

export const ajustesIniciais: SolicitacaoAjuste[] = [
  {
    id: "aj1",
    sku: "CL-0713",
    lojaId: "l1",
    quantidade: -1,
    motivo: "Peça avariada no mostruário (fivela solta)",
    solicitante: "Vinícius Prado",
    data: "2026-09-03",
    status: "Pendente",
  },
  {
    id: "aj2",
    sku: "CL-0611",
    lojaId: "l2",
    quantidade: 2,
    motivo: "Divergência encontrada na contagem da arara",
    solicitante: "Rafael Queiroz",
    data: "2026-09-02",
    status: "Pendente",
  },
];

export const reposicoesIniciais: SolicitacaoReposicao[] = [
  {
    id: "rp1",
    sku: "CL-0102",
    solicitanteLojaId: "l3",
    destinatarioLojaId: "l1",
    quantidade: 4,
    solicitante: "Juliana Prado",
    data: "2026-09-02",
    status: "Aberta",
  },
  {
    id: "rp2",
    sku: "CL-0306",
    solicitanteLojaId: "l2",
    destinatarioLojaId: null,
    quantidade: 3,
    solicitante: "Rafael Queiroz",
    data: "2026-09-01",
    status: "Aberta",
  },
];

// ===================== Clientes, pedidos e chamados =====================

export const CLIENTE_DEMO_ID = "c1";

export const clientes: Cliente[] = [
  {
    id: "c1",
    nome: "Helena Vasconcelos",
    email: "helena.vasconcelos@email.com",
    telefone: "(11) 98844-2210",
    cidade: "São Paulo, SP",
    desde: "2023-04-12",
  },
  {
    id: "c2",
    nome: "Ricardo Menezes",
    email: "ricardo.menezes@email.com",
    telefone: "(21) 99120-8845",
    cidade: "Rio de Janeiro, RJ",
    desde: "2022-11-03",
  },
  {
    id: "c3",
    nome: "Beatriz Alcântara",
    email: "beatriz.alcantara@email.com",
    telefone: "(31) 98771-4402",
    cidade: "Belo Horizonte, MG",
    desde: "2024-01-27",
  },
  {
    id: "c4",
    nome: "Tomás Ferreira",
    email: "tomas.ferreira@email.com",
    telefone: "(11) 99655-1180",
    cidade: "Campinas, SP",
    desde: "2021-08-09",
  },
  {
    id: "c5",
    nome: "Lívia Sampaio",
    email: "livia.sampaio@email.com",
    telefone: "(21) 98410-7723",
    cidade: "Niterói, RJ",
    desde: "2025-02-18",
  },
];

export const nomeCliente = (id: string) => clientes.find((c) => c.id === id)?.nome ?? "—";

export const pedidosIniciais: Pedido[] = [
  {
    id: "PD-10421",
    clienteId: "c1",
    data: "2026-08-24",
    valor: 1969,
    lojaId: "l1",
    status: "Em transporte",
    itens: [
      { sku: "CL-0509", nome: "Trench Coat Milano", quantidade: 1, valor: 1690 },
      { sku: "CL-0713", nome: "Cinto Couro Siena", quantidade: 1, valor: 279 },
    ],
  },
  {
    id: "PD-10388",
    clienteId: "c1",
    data: "2026-07-30",
    valor: 899,
    lojaId: "l1",
    status: "Entregue",
    itens: [{ sku: "CL-0305", nome: "Vestido Midi Amalfi", quantidade: 1, valor: 899 }],
  },
  {
    id: "PD-10302",
    clienteId: "c1",
    data: "2026-06-11",
    valor: 778,
    lojaId: "l1",
    status: "Entregue",
    itens: [{ sku: "CL-0101", nome: "Camisa de Linho Ravena", quantidade: 2, valor: 389 }],
  },
  {
    id: "PD-10415",
    clienteId: "c2",
    data: "2026-08-21",
    valor: 2190,
    lojaId: "l2",
    status: "Separação",
    itens: [{ sku: "CL-0510", nome: "Jaqueta Couro Firenze", quantidade: 1, valor: 2190 }],
  },
  {
    id: "PD-10360",
    clienteId: "c2",
    data: "2026-07-08",
    valor: 529,
    lojaId: "l2",
    status: "Entregue",
    itens: [{ sku: "CL-0611", nome: "Saia Plissada Como", quantidade: 1, valor: 529 }],
  },
  {
    id: "PD-10399",
    clienteId: "c3",
    data: "2026-08-02",
    valor: 459,
    lojaId: "l3",
    status: "Entregue",
    itens: [{ sku: "CL-0407", nome: "Tricot Gola Alta Bolonha", quantidade: 1, valor: 459 }],
  },
  {
    id: "PD-10430",
    clienteId: "c3",
    data: "2026-08-27",
    valor: 1090,
    lojaId: "l3",
    status: "Em transporte",
    itens: [{ sku: "CL-0815", nome: "Bota Chelsea Asolo", quantidade: 1, valor: 1090 }],
  },
  {
    id: "PD-10344",
    clienteId: "c4",
    data: "2026-06-29",
    valor: 1290,
    lojaId: "l1",
    status: "Cancelado",
    itens: [{ sku: "CL-0204", nome: "Blazer Estruturado Modena", quantidade: 1, valor: 1290 }],
  },
  {
    id: "PD-10408",
    clienteId: "c4",
    data: "2026-08-15",
    valor: 899,
    lojaId: "l1",
    status: "Entregue",
    itens: [{ sku: "CL-0814", nome: "Mocassim Pádua", quantidade: 1, valor: 899 }],
  },
  {
    id: "PD-10426",
    clienteId: "c5",
    data: "2026-08-26",
    valor: 1150,
    lojaId: "l2",
    status: "Separação",
    itens: [{ sku: "CL-0712", nome: "Bolsa Estruturada Lucca", quantidade: 1, valor: 1150 }],
  },
];

export const chamadosIniciais: Chamado[] = [
  {
    id: "ch1",
    protocolo: "AT-2026-0841",
    clienteId: "c1",
    assunto: "Trench coat ainda não chegou",
    motivo: "Entrega",
    canal: "Portal",
    lojaId: "l1",
    pedidoId: "PD-10421",
    prioridade: "Média",
    status: "Em andamento",
    abertoEm: "2026-08-29",
    mensagens: [
      {
        id: "m1",
        autor: "cliente",
        nome: "Helena Vasconcelos",
        data: "2026-08-29 09:12",
        texto:
          "Bom dia! Meu pedido PD-10421 consta como em transporte desde o dia 24 e ainda não recebi. Consigo uma previsão?",
      },
      {
        id: "m2",
        autor: "atendente",
        nome: "Marina Toledo",
        data: "2026-08-29 10:41",
        texto:
          "Olá, Helena! Já acionamos a transportadora. A nova previsão é para até 02/09. Qualquer mudança eu aviso por aqui.",
      },
    ],
  },
  {
    id: "ch2",
    protocolo: "AT-2026-0839",
    clienteId: "c2",
    assunto: "Troca de numeração da jaqueta",
    motivo: "Troca",
    canal: "WhatsApp",
    lojaId: "l2",
    pedidoId: "PD-10415",
    prioridade: "Média",
    status: "Aberto",
    abertoEm: "2026-08-28",
    mensagens: [
      {
        id: "m1",
        autor: "cliente",
        nome: "Ricardo Menezes",
        data: "2026-08-28 16:05",
        texto: "Comprei a Jaqueta Firenze no tamanho M, mas preciso da G. Tem disponível na Barra?",
      },
    ],
  },
  {
    id: "ch3",
    protocolo: "AT-2026-0835",
    clienteId: "c3",
    assunto: "Costura solta no tricot",
    motivo: "Defeito",
    canal: "Loja",
    lojaId: "l3",
    pedidoId: "PD-10399",
    prioridade: "Alta",
    anexos: [
      { id: "an1", nome: "costura-manga-1.jpg", descricao: "Costura solta na manga esquerda" },
      { id: "an2", nome: "etiqueta-peca.jpg", descricao: "Etiqueta com composição do tricot" },
    ],
    status: "Em andamento",
    abertoEm: "2026-08-26",
    mensagens: [
      {
        id: "m1",
        autor: "cliente",
        nome: "Beatriz Alcântara",
        data: "2026-08-26 11:20",
        texto: "O tricot apresentou costura solta na manga depois da segunda lavagem.",
      },
      {
        id: "m2",
        autor: "atendente",
        nome: "Juliana Prado",
        data: "2026-08-26 14:02",
        texto: "Beatriz, pode trazer na Savassi? Encaminhamos para o ateliê sem custo.",
      },
    ],
  },
  {
    id: "ch4",
    protocolo: "AT-2026-0828",
    clienteId: "c4",
    assunto: "Estorno do pedido cancelado",
    motivo: "Dúvida",
    canal: "E-mail",
    lojaId: "l1",
    pedidoId: "PD-10344",
    prioridade: "Baixa",
    status: "Resolvido",
    abertoEm: "2026-08-20",
    mensagens: [
      {
        id: "m1",
        autor: "cliente",
        nome: "Tomás Ferreira",
        data: "2026-08-20 08:44",
        texto: "Quando cai o estorno do blazer cancelado?",
      },
      {
        id: "m2",
        autor: "atendente",
        nome: "Marina Toledo",
        data: "2026-08-20 09:30",
        texto: "Estorno processado, aparece em até duas faturas do cartão. Protocolo encerrado.",
      },
    ],
  },
  {
    id: "ch5",
    protocolo: "AT-2026-0822",
    clienteId: "c5",
    assunto: "Disponibilidade da bolsa Lucca em outra cor",
    motivo: "Dúvida",
    canal: "Portal",
    lojaId: "l2",
    prioridade: "Baixa",
    status: "Aberto",
    abertoEm: "2026-08-19",
    mensagens: [
      {
        id: "m1",
        autor: "cliente",
        nome: "Lívia Sampaio",
        data: "2026-08-19 19:33",
        texto: "A bolsa Lucca sai em caramelo nesta temporada?",
      },
    ],
  },
  {
    id: "ch6",
    protocolo: "AT-2026-0815",
    clienteId: "c1",
    assunto: "Ajuste de barra do vestido Amalfi",
    motivo: "Troca",
    canal: "Loja",
    lojaId: "l1",
    pedidoId: "PD-10388",
    prioridade: "Baixa",
    status: "Resolvido",
    abertoEm: "2026-08-05",
    mensagens: [
      {
        id: "m1",
        autor: "cliente",
        nome: "Helena Vasconcelos",
        data: "2026-08-05 15:10",
        texto: "Gostaria de ajustar a barra do vestido comprado no Ibirapuera.",
      },
      {
        id: "m2",
        autor: "atendente",
        nome: "Marina Toledo",
        data: "2026-08-06 10:00",
        texto: "Ajuste concluído e peça retirada na loja. Obrigada, Helena!",
      },
    ],
  },
  {
    id: "ch7",
    protocolo: "AT-2026-0809",
    clienteId: "c3",
    assunto: "Bota Asolo esgotada no site",
    motivo: "Dúvida",
    canal: "WhatsApp",
    lojaId: "l3",
    prioridade: "Média",
    status: "Resolvido",
    abertoEm: "2026-07-31",
    mensagens: [
      {
        id: "m1",
        autor: "cliente",
        nome: "Beatriz Alcântara",
        data: "2026-07-31 12:15",
        texto: "A bota Chelsea Asolo 37 volta ao estoque?",
      },
      {
        id: "m2",
        autor: "atendente",
        nome: "Juliana Prado",
        data: "2026-07-31 13:02",
        texto: "Reservamos uma unidade vinda da Barra. Pedido PD-10430 confirmado.",
      },
    ],
  },
  {
    id: "ch8",
    protocolo: "AT-2026-0804",
    clienteId: "c2",
    assunto: "Nota fiscal do pedido de julho",
    motivo: "Dúvida",
    canal: "E-mail",
    lojaId: "l2",
    pedidoId: "PD-10360",
    prioridade: "Alta",
    anexos: [
      { id: "an3", nome: "comprovante-pedido.png", descricao: "Comprovante do pedido PD-10360" },
    ],
    status: "Em andamento",
    abertoEm: "2026-07-28",
    mensagens: [
      {
        id: "m1",
        autor: "cliente",
        nome: "Ricardo Menezes",
        data: "2026-07-28 17:45",
        texto: "Preciso da nota fiscal do pedido PD-10360 para reembolso corporativo.",
      },
    ],
  },
];

/** Prioridade explícita do chamado; sem valor definido, deriva do motivo. */
export const prioridadeChamado = (c: Chamado): Prioridade =>
  c.prioridade ?? (c.motivo === "Defeito" ? "Alta" : c.motivo === "Entrega" ? "Média" : "Baixa");

// ===================== Time interno e administração =====================

export const rotuloPapelUsuario: Record<PapelUsuario, string> = {
  operador_estoque: "Operador de estoque",
  atendente: "Atendente",
  gerente_loja: "Gerente de loja",
  admin: "Administrador",
};

export const usuariosIniciais: Usuario[] = [
  {
    id: "u1",
    nome: "Vinícius Prado",
    email: "vinicius.prado@casalorenzi.com.br",
    papel: "operador_estoque",
    lojaId: "l1",
    ativo: true,
  },
  {
    id: "u2",
    nome: "Marina Toledo",
    email: "marina.toledo@casalorenzi.com.br",
    papel: "gerente_loja",
    lojaId: "l1",
    ativo: true,
  },
  {
    id: "u3",
    nome: "Rafael Nunes",
    email: "rafael.nunes@casalorenzi.com.br",
    papel: "atendente",
    lojaId: "l1",
    ativo: true,
  },
  {
    id: "u4",
    nome: "Cecília Lorenzi",
    email: "cecilia.lorenzi@casalorenzi.com.br",
    papel: "admin",
    lojaId: null,
    ativo: true,
  },
  {
    id: "u5",
    nome: "Aline Barreto",
    email: "aline.barreto@casalorenzi.com.br",
    papel: "operador_estoque",
    lojaId: "l1",
    ativo: true,
  },
  {
    id: "u6",
    nome: "Rafael Queiroz",
    email: "rafael.queiroz@casalorenzi.com.br",
    papel: "gerente_loja",
    lojaId: "l2",
    ativo: true,
  },
  {
    id: "u7",
    nome: "Juliana Prado",
    email: "juliana.prado@casalorenzi.com.br",
    papel: "gerente_loja",
    lojaId: "l3",
    ativo: true,
  },
];

export const auditoriaInicial: Auditoria[] = [
  {
    id: "au1",
    data: "2026-09-03",
    autor: "Marina Toledo",
    acao: "Aprovou ajuste manual",
    detalhe: "CL-0713 · −1 unidade · Shopping Ibirapuera",
  },
  {
    id: "au2",
    data: "2026-09-02",
    autor: "Cecília Lorenzi",
    acao: "Editou catálogo",
    detalhe: "Preço de CL-0509 atualizado para R$ 1.690",
  },
  {
    id: "au3",
    data: "2026-08-30",
    autor: "Cecília Lorenzi",
    acao: "Alterou papel de usuário",
    detalhe: "Aline Barreto passou a operador de estoque na unidade Ibirapuera",
  },
];

export const lotesImportacao: LoteImportacao[] = [
  {
    id: "IMP-2026-014",
    origem: "Vulto",
    registros: 128,
    pendentes: 6,
    status: "Pendente de mapeamento",
    recebidoEm: "2026-09-03",
  },
  {
    id: "IMP-2026-013",
    origem: "Vulto",
    registros: 96,
    pendentes: 0,
    status: "Processado",
    recebidoEm: "2026-08-27",
  },
  {
    id: "IMP-2026-012",
    origem: "Vulto",
    registros: 74,
    pendentes: 3,
    status: "Com erro",
    recebidoEm: "2026-08-19",
  },
];

export const registrosImportacao: RegistroImportacao[] = [
  {
    id: "ri1",
    loteId: "IMP-2026-014",
    descricaoExterna: "CAMISA LINHO RAVENA P BRANCA",
    codigoExterno: "VLT-77120",
    skuMapeado: null,
  },
  {
    id: "ri2",
    loteId: "IMP-2026-014",
    descricaoExterna: "BLAZER MODENA 42 GRAFITE",
    codigoExterno: "VLT-77188",
    skuMapeado: null,
  },
  {
    id: "ri3",
    loteId: "IMP-2026-013",
    descricaoExterna: "CINTO SIENA U CARAMELO",
    codigoExterno: "VLT-76004",
    skuMapeado: "CL-0713",
  },
];

// ===================== Vitrine =====================

export const tamanhosPorCategoria: Record<string, string[]> = {
  Camisaria: ["P", "M", "G", "GG"],
  Alfaiataria: ["38", "40", "42", "44"],
  Calças: ["38", "40", "42", "44"],
  Vestidos: ["P", "M", "G"],
  Malharia: ["P", "M", "G", "GG"],
  Outerwear: ["P", "M", "G"],
  Saias: ["36", "38", "40", "42"],
  Acessórios: ["Único"],
  Calçados: ["35", "36", "37", "38", "39"],
};

/** Cores por categoria, com o tom usado na amostra (swatch) da vitrine. */
export const coresPorCategoria: Record<string, { nome: string; hex: string }[]> = {
  Camisaria: [
    { nome: "Branco", hex: "#f7f5f0" },
    { nome: "Areia", hex: "#d8c7a8" },
  ],
  Alfaiataria: [
    { nome: "Grafite", hex: "#4a4d52" },
    { nome: "Marinho", hex: "#1f2f4f" },
  ],
  Calças: [
    { nome: "Areia", hex: "#d9c8a9" },
    { nome: "Marinho", hex: "#1f2f4f" },
  ],
  Vestidos: [
    { nome: "Vinho", hex: "#5b1a24" },
    { nome: "Preto", hex: "#1a1a1a" },
  ],
  Malharia: [
    { nome: "Camelo", hex: "#b08556" },
    { nome: "Off-white", hex: "#efe9dc" },
  ],
  Outerwear: [
    { nome: "Camelo", hex: "#b08556" },
    { nome: "Preto", hex: "#1a1a1a" },
  ],
  Saias: [
    { nome: "Preto", hex: "#1a1a1a" },
    { nome: "Grafite", hex: "#4a4d52" },
  ],
  Acessórios: [
    { nome: "Caramelo", hex: "#9a5f2c" },
    { nome: "Preto", hex: "#1a1a1a" },
  ],
  Calçados: [
    { nome: "Café", hex: "#4b3326" },
    { nome: "Preto", hex: "#1a1a1a" },
  ],
};

export const descricaoProduto = (nome: string, categoria: string) =>
  `${nome} da linha ${categoria} Casa Lorenzi: modelagem clássica, acabamento artesanal e tecidos selecionados em ateliês italianos. Peça atemporal, pensada para durar temporadas.`;

/** SKU final escolhido pelo cliente (produto + tamanho + cor). */
export const skuVariacao = (sku: string, tamanho: string, cor: string) =>
  `${sku}-${tamanho}-${cor.slice(0, 3).toUpperCase()}`;

// ===================== Formatação e cálculos =====================

export const moeda = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const dataBR = (iso: string) => {
  const d = iso.split(" ")[0] ?? iso;
  const [a, m, dia] = d.split("-");
  return dia ? `${dia}/${m}/${a}` : iso;
};

const saldosDe = (p: Produto, lojaIds?: string[]) =>
  lojaIds ? p.saldos.filter((s) => lojaIds.includes(s.lojaId)) : p.saldos;

export const totalProduto = (p: Produto, lojaIds?: string[]) =>
  saldosDe(p, lojaIds).reduce((s, x) => s + x.quantidade, 0);

export const produtoTemEstoque = (p: Produto, lojaIds?: string[]) => {
  const saldos = saldosDe(p, lojaIds);
  return saldos.length === 0 || saldos.reduce((s, x) => s + x.quantidade, 0) > 0;
};

export type StatusEstoque = "OK" | "Estoque baixo" | "Esgotado";

export const statusProduto = (p: Produto, lojaIds?: string[]): StatusEstoque => {
  const total = totalProduto(p, lojaIds);
  if (total === 0) return "Esgotado";
  const minimoTotal = saldosDe(p, lojaIds).reduce((s, x) => s + x.minimo, 0);
  return total <= minimoTotal ? "Estoque baixo" : "OK";
};

// Tons de badge por status — centralizados para todas as telas usarem o mesmo código de cor.
export const tomEstoque = { OK: "ok", "Estoque baixo": "alerta", Esgotado: "perigo" } as const;
export const tomPrioridade = { Alta: "perigo", Média: "alerta", Baixa: "neutro" } as const;
export const tomChamado = { Aberto: "perigo", "Em andamento": "alerta", Resolvido: "ok" } as const;
export const tomPedido = {
  Entregue: "ok",
  "Em transporte": "alerta",
  Separação: "destaque",
  Cancelado: "perigo",
} as const;
export const tomTransferencia = {
  Pendente: "alerta",
  Aceita: "destaque",
  Recebida: "ok",
  Recusada: "perigo",
} as const;
export const tomAjuste = { Pendente: "alerta", Aprovado: "ok", Recusado: "perigo" } as const;
export const tomReposicao = { Aberta: "alerta", Aceita: "ok", Recusada: "perigo" } as const;

// ===================== Datas sempre recentes =====================

/**
 * Os dados de demonstração foram escritos como se "hoje" fosse 04/09/2026.
 * Deslocamos todas as datas para que o mais recente fique sempre perto de hoje —
 * assim os filtros de período dos dashboards encontram os chamados e pedidos.
 */
const REFERENCIA = Date.UTC(2026, 8, 4);
const hojeLocal = new Date();
const deslocamento = Math.round(
  (Date.UTC(hojeLocal.getFullYear(), hojeLocal.getMonth(), hojeLocal.getDate()) - REFERENCIA) / 864e5,
);

function ajustar(data: string) {
  const [dia, hora] = data.split(" ");
  const d = new Date(`${dia}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deslocamento);
  return hora ? `${d.toISOString().slice(0, 10)} ${hora}` : d.toISOString().slice(0, 10);
}

if (deslocamento !== 0) {
  produtosIniciais.forEach((p) => p.movimentacoes.forEach((m) => (m.data = ajustar(m.data))));
  for (const lista of [transferenciasIniciais, ajustesIniciais, reposicoesIniciais, pedidosIniciais, auditoriaInicial])
    lista.forEach((x) => (x.data = ajustar(x.data)));
  chamadosIniciais.forEach((c) => {
    c.abertoEm = ajustar(c.abertoEm);
    c.mensagens.forEach((m) => (m.data = ajustar(m.data)));
  });
  lotesImportacao.forEach((l) => (l.recebidoEm = ajustar(l.recebidoEm)));
}
