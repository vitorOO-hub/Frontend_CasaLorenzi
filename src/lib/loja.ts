/**
 * Conteúdo editorial da loja: fotos vestidas, tecidos, cores com nome da casa,
 * as três casas, o Caderno do Ateliê e os retratos de clientes.
 *
 * Fotos: Unsplash (licença livre) para o protótipo — trocar pela sessão própria.
 * Nomes de pessoas, histórias e eventos são ilustrativos.
 */

export const unsplash = (id: string, largura = 1200) =>
  `https://images.unsplash.com/photo-${id}?w=${largura}&q=80&auto=format&fit=crop`;

export type CorDaCasa = { nome: string; hex: string };

/** Cores com nome próprio, ligadas às três cidades. */
export const CORES = {
  areiaIpanema: { nome: "Areia de Ipanema", hex: "#d9c8a9" },
  noitePaulistana: { nome: "Noite paulistana", hex: "#1b2a4a" },
  ceuMinas: { nome: "Céu de Minas", hex: "#8fa1b5" },
  cafe: { nome: "Café", hex: "#6b4e36" },
  mate: { nome: "Mate", hex: "#7a6a4f" },
  tabaco: { nome: "Tabaco", hex: "#4a3326" },
  caramelo: { nome: "Caramelo", hex: "#9a5f2c" },
  giz: { nome: "Branco giz", hex: "#f4f1ea" },
  grafite: { nome: "Grafite", hex: "#4a4d52" },
  carvao: { nome: "Carvão", hex: "#1f1f1f" },
} satisfies Record<string, CorDaCasa>;

type Detalhe = {
  tecido: string; // complemento do nome: "em gabardine de algodão"
  cores: CorDaCasa[];
  foto: string; // foto vestida (id Unsplash)
  tecelagem: string;
  costuradoEm: string;
  nota: string; // uma frase concreta sobre a peça
};

const D = (tecido: string, cores: CorDaCasa[], foto: string, tecelagem: string, costuradoEm: string, nota: string): Detalhe => ({
  tecido,
  cores,
  foto,
  tecelagem,
  costuradoEm,
  nota,
});

export const detalhes: Record<string, Detalhe> = {
  "CL-0101": D("em linho lavado", [CORES.giz, CORES.ceuMinas], "1603394151492-5e9b974b090b", "Linho irlandês", "Bom Retiro, SP", "Gola italiana que fica em pé sem gravata. Fica melhor a cada lavagem."),
  "CL-0102": D("em oxford de algodão egípcio", [CORES.giz, CORES.ceuMinas], "1594168087746-d94175b42394", "Fio egípcio, tecido em Americana, SP", "Bom Retiro, SP", "A camisa de todo dia, com botão de madrepérola."),
  "CL-0203": D("em lã fria, cintura alta", [CORES.areiaIpanema, CORES.noitePaulistana], "1590873802674-55bb8f947bc5", "Biella, Itália", "Bom Retiro, SP", "Pregas viradas para dentro e barra feita na hora, na loja."),
  "CL-0204": D("em lã fria pied-de-poule", [CORES.cafe, CORES.noitePaulistana], "1608234808654-2a8875faa7fd", "Biella, Itália", "Bom Retiro, SP", "Ombro natural, dois botões e forro de cupro que respira."),
  "CL-0305": D("em crepe de viscose", [CORES.tabaco, CORES.carvao], "1496747611176-843222e1e57c", "Crepe nacional, Blumenau, SC", "Ateliê da Barra, RJ", "Comprimento midi que ajustamos à sua altura sem custo."),
  "CL-0306": D("em cetim de seda", [CORES.tabaco, CORES.carvao], "1790802222952-eb7e610de0d1", "Como, Itália", "Ateliê da Barra, RJ", "Alças reguláveis e viés cortado à mão."),
  "CL-0407": D("em merino extrafino", [CORES.mate, CORES.areiaIpanema], "1519831296458-9341fc9d2b18", "Merino de 18,5 mícrons", "Malharia em Monte Sião, MG", "Fina o bastante para ir por baixo do blazer."),
  "CL-0408": D("em lã merino canelada", [CORES.mate, CORES.areiaIpanema], "1641642231157-0849081598a2", "Merino de 19 mícrons", "Malharia em Monte Sião, MG", "Ponto canelado que não deforma no cotovelo."),
  "CL-0509": D("em gabardine de algodão", [CORES.areiaIpanema, CORES.noitePaulistana], "1544246108-14b45872b02d", "Gabardine de algodão egípcio", "Bom Retiro, SP", "Cinto forrado e ombro que segura a garoa."),
  "CL-0510": D("em couro de cordeiro", [CORES.cafe, CORES.carvao], "1700993443419-b6f067e734e4", "Curtume em Franca, SP", "Franca, SP", "Couro que amacia e escurece com o uso."),
  "CL-0611": D("em crepe plissado", [CORES.carvao, CORES.grafite], "1533659828870-95ee305cee3e", "Crepe plissado permanente", "Ateliê da Barra, RJ", "As pregas não saem na lavagem."),
  "CL-0712": D("em couro curtido ao vegetal", [CORES.caramelo, CORES.carvao], "1560891958-68bb1fe7fb78", "Curtume em Novo Hamburgo, RS", "Novo Hamburgo, RS", "Cabe um notebook de 13 polegadas e um guarda-chuva."),
  "CL-0713": D("em couro de cinto de 3,5 cm", [CORES.caramelo, CORES.carvao], "1593030103066-0093718efeb9", "Curtume em Franca, SP", "Franca, SP", "Fivela de latão envelhecido, furos feitos na loja."),
  "CL-0814": D("em couro de bezerro", [CORES.cafe, CORES.carvao], "1556004583-d2aaffbba592", "Curtume em Franca, SP", "Franca, SP", "Montado à mão, com sola de couro e salto de borracha."),
  "CL-0815": D("em camurça", [CORES.cafe, CORES.carvao], "1617391258031-f8d80b22fb35", "Curtume em Franca, SP", "Franca, SP", "Elástico lateral e sola que aguenta calçada molhada."),
};

const padrao: Detalhe = D("", [CORES.noitePaulistana], "", "—", "Bom Retiro, SP", "Peça nova no catálogo.");
export const detalheDe = (sku: string): Detalhe => detalhes[sku.slice(0, 7)] ?? padrao;

/** Foto vestida da peça (cai na foto de estúdio quando não há). */
export const fotoVestida = (sku: string, largura = 900) => {
  const d = detalheDe(sku);
  return d.foto ? unsplash(d.foto, largura) : undefined;
};

export const fotoEstudio = (sku: string) => `/img/produtos/${sku.slice(0, 7)}.jpg`;

// ===================== Edição atual =====================

export const EDICAO = {
  numero: 64,
  nome: "Garoa",
  temporada: "outono e inverno 2026",
  texto:
    "São Paulo tem um mês por ano em que ninguém sabe se leva casaco. Esta edição foi feita para ele: gabardine que segura o chuvisco, lã fria que não pesa, um tricot que vai e volta do escritório no mesmo dia.",
};

// ===================== As três casas =====================

export type InfoCasa = {
  foto: string;
  alfaiate: string;
  provas: string;
  agenda: string;
  bilhete: string;
  autor: string;
};

export const casas: Record<string, InfoCasa> = {
  l1: {
    foto: "1595879948834-5295840b63d4",
    alfaiate: "Sr. Antônio, desde 1993",
    provas: "Ter. a sáb., 10h às 20h",
    agenda: "Sábado, 18/10 — tarde de ajustes gratuitos",
    bilhete: "Passe aqui no sábado: o café é por nossa conta e a barra fica pronta enquanto você espera.",
    autor: "Marina",
  },
  l2: {
    foto: "1718927111065-4bfab7d50a82",
    alfaiate: "Dona Celeste, desde 2004",
    provas: "Seg. a sáb., 11h às 21h",
    agenda: "Quinta, 23/10 — o linho para o verão chegou",
    bilhete: "Aqui o linho vende o ano todo. Peça para ver o tecido Ipanema antes de decidir.",
    autor: "Rafael",
  },
  l3: {
    foto: "1566830790860-f9cad9d4cfbd",
    alfaiate: "Sr. Geraldo, desde 1999",
    provas: "Seg. a sáb., 10h às 19h",
    agenda: "Até 30/10 — gravuras de Lívia Mendes na loja",
    bilhete: "Venha ver a exposição e fique para um pão de queijo. Os ajustes, como sempre, são por nossa conta.",
    autor: "Juliana",
  },
};

// ===================== Caderno do Ateliê =====================

export type Materia = {
  slug: string;
  secao: string;
  leitura: string;
  titulo: string;
  resumo: string;
  foto: string;
  corpo: string[];
};

export const materias: Materia[] = [
  {
    slug: "la-fria",
    secao: "Tecidos",
    leitura: "4 min",
    titulo: "Por que a lã fria não esquenta — explicado em três amostras",
    resumo: "O nome engana: é a torção do fio, e não a temperatura, que faz a diferença.",
    foto: "1770970831074-6e88b6cc260b",
    corpo: [
      "Lã fria é o nome que os alfaiates deram a um tecido de lã penteada, de fio fino e muito torcido. A torção deixa o fio liso e o tecido aberto: o ar circula, e o corpo não abafa.",
      "Na mão, a diferença aparece logo. Uma flanela é macia e felpuda; a lã fria é seca, quase fresca ao toque, e volta ao lugar quando você amassa.",
      "Por isso o Blazer Modena e a Calça Torino desta edição são feitos dela: atravessam um dia inteiro de São Paulo — o frio da manhã, o sol do meio-dia, a garoa da volta.",
    ],
  },
  {
    slug: "dr-paulo",
    secao: "Uma prova com",
    leitura: "6 min",
    titulo: "Dr. Paulo, cliente desde 1978",
    resumo: "Quarenta e oito anos de ternos, e uma opinião firme sobre lapelas.",
    foto: "1785921697232-121a8011d4b8",
    corpo: [
      "O Dr. Paulo chegou ao Bom Retiro em 1978 para fazer o terno da formatura. Voltou para o do casamento, para o da primeira audiência e, este mês, para o do casamento da neta.",
      "Ele chega sempre com o mesmo pedido: lapela de oito centímetros, nem um milímetro a mais. O Sr. Antônio já nem pergunta.",
      "Nesta prova, escolheu uma lã fria cor de café. “Azul eu já tenho cinco”, disse, enquanto o giz corria pelo ombro.",
    ],
  },
  {
    slug: "1962",
    secao: "Família",
    leitura: "8 min",
    titulo: "1962: a primeira tesoura",
    resumo: "Como uma portinha no Bom Retiro virou três casas.",
    foto: "1531831108325-7fe9616bc780",
    corpo: [
      "Em 1962, Vittorio Lorenzi abriu uma portinha na Rua José Paulino com uma mesa de corte, uma máquina emprestada e uma tesoura trazida de Biella.",
      "Os primeiros clientes eram vizinhos do bairro. Depois vieram os filhos dos vizinhos, e os netos. A casa cresceu devagar, uma prova de cada vez.",
      "Hoje são três casas — Ibirapuera, Barra e Savassi — e a tesoura de 1962 continua na parede do ateliê de São Paulo.",
    ],
  },
];

// ===================== Quem veste Lorenzi =====================

export const retratos = [
  { foto: "1607464501280-237b5f87fd77", nome: "Dona Ivone, 74.", texto: "Sobretudo Aosta, ajustado duas vezes." },
  { foto: "1619603364937-8d7af41ef206", nome: "Rafael, 31.", texto: "Primeiro terno, para o casamento do irmão." },
  { foto: "1570479556229-98dfe52e8868", nome: "Seu Álvaro, 68.", texto: "Cliente da Savassi desde a inauguração." },
  { foto: "1573545289441-827c028f7a3b", nome: "Lúcia e Bia,", texto: "mãe e filha, no mesmo trench." },
];

// ===================== Fotos de campanha =====================

export const CAMPANHA = {
  prontaEntrega: "1544246108-14b45872b02d",
  sobMedida: "1584184924103-e310d9dc82fc",
  edicaoGrande: "1589400445193-c881a4b0b38a",
  edicaoDetalhe: "1633821879282-0c4e91f96232",
  prova1: "1623578059518-bbdb071eab81",
  prova2: "1769192932507-edee0acdd5ca",
  prova3: "1780244786334-e3eb7e37766d",
  amostras: "1781888699751-15f2b304693c",
};
