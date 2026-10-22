import { api } from "@/api/http";
import type { Produto } from "./dados";
import { lista, numero, numeroOuNulo, objeto, texto, textoOuNulo } from "./validacao";
import { validarRegras, type RegrasLorenziMais } from "./regrasLorenziMais";
import { validarAvisoDeVencimento, type AvisoDeVencimento } from "./vencimentoPontos";

export { textoDoAviso } from "./vencimentoPontos";

/**
 * Casa Lorenzi+: a linha Vulto dentro da loja e o Vulto+, o programa de pontos da casa inteira
 * (vale nas lojas Casa Lorenzi e Vulto e no site). Espelha GET /cliente/vulto-mais do backend.
 */

const normalizar = (valor: string | null | undefined) =>
  (valor ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/** Peça da linha Vulto: a marca do catálogo diz de onde ela vem. */
export const ehVulto = (produto: Pick<Produto, "marca">) => normalizar(produto.marca) === "vulto";

/** Amostra aproximada das cores das peças Vulto (vêm só pelo nome); desconhecida = cinza neutro. */
const CORES_PELO_NOME: Record<string, string> = {
  "verde oliva": "#6b6b3a",
  "off white": "#f2efe6",
  branco: "#fafaf7",
  bege: "#d9c8a9",
  marrom: "#6b4a32",
  amarelo: "#e6c34a",
  "amarelo manteiga": "#f1e3a1",
  "azul marinho": "#1f2a48",
  vinho: "#6b1f2e",
  preto: "#111111",
  "cinza mescla": "#9a9a9a",
  lilas: "#b9a3c9",
  lavanda: "#c8bde3",
  "jeans claro": "#8fa9c7",
  "jeans escuro": "#3b4f6b",
  areia: "#d8c9ad",
  cafe: "#4a3426",
};

export const corPeloNome = (nome: string) => CORES_PELO_NOME[normalizar(nome)] ?? "#c9c3b8";

export type MarcaFiltro = "" | "casa-lorenzi" | "vulto";

export const MARCAS_FILTRO: { valor: MarcaFiltro; rotulo: string }[] = [
  { valor: "", rotulo: "Todas" },
  { valor: "casa-lorenzi", rotulo: "Casa Lorenzi" },
  { valor: "vulto", rotulo: "Vulto" },
];

export const daMarca = (produto: Pick<Produto, "marca">, marca: MarcaFiltro) =>
  !marca || (marca === "vulto" ? ehVulto(produto) : !ehVulto(produto));

export type MovimentoPontos = { ocorrido_em: string; tipo: string; pontos: number; descricao: string };

export type VultoMais = AvisoDeVencimento & {
  saldo: number;
  categoria: string;
  creditos_no_ano: number;
  proxima_categoria: string | null;
  faltam_para_proxima: number | null;
  extrato: MovimentoPontos[];
  regras: RegrasLorenziMais;
};

export function validarVultoMais(dados: unknown): VultoMais {
  const o = objeto(dados, "vulto_mais");
  return {
    saldo: numero(o.saldo, "saldo"),
    categoria: texto(o.categoria, "categoria"),
    creditos_no_ano: numero(o.creditos_no_ano, "creditos_no_ano"),
    proxima_categoria: textoOuNulo(o.proxima_categoria, "proxima_categoria"),
    faltam_para_proxima: numeroOuNulo(o.faltam_para_proxima ?? null, "faltam_para_proxima"),
    ...validarAvisoDeVencimento(o),
    regras: validarRegras(o.regras),
    extrato: lista(o.extrato, "extrato").map((item, i) => {
      const m = objeto(item, `extrato.${i}`);
      return {
        ocorrido_em: texto(m.ocorrido_em, `extrato.${i}.ocorrido_em`),
        tipo: texto(m.tipo, `extrato.${i}.tipo`),
        pontos: numero(m.pontos, `extrato.${i}.pontos`),
        descricao: texto(m.descricao, `extrato.${i}.descricao`),
      };
    }),
  };
}

export const obterVultoMais = async () => validarVultoMais(await api.get<unknown>("/cliente/vulto-mais"));

export const pontos = (valor: number) => valor.toLocaleString("pt-BR");

const TIPOS: Record<string, string> = {
  credito: "Crédito",
  resgate: "Resgate",
  estorno: "Estorno",
  ajuste: "Ajuste",
  vencimento: "Vencimento",
};

export const rotuloTipo = (tipo: string) => TIPOS[tipo] ?? tipo;
