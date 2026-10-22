import { api } from "@/api/http";
import type { Produto } from "./dados";
import { lista, numero, numeroOuNulo, objeto, texto, textoOuNulo } from "./validacao";

/**
 * Casa Lorenzi+: a linha Vulto dentro da loja e o Vulto+, o programa de pontos da casa inteira
 * (vale nas lojas Casa Lorenzi e Vulto e no site). Espelha GET /cliente/vulto-mais do backend.
 */

const normalizar = (valor: string | null | undefined) =>
  (valor ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/** Peça da linha Vulto: a marca do catálogo diz de onde ela vem. */
export const ehVulto = (produto: Pick<Produto, "marca">) => normalizar(produto.marca) === "vulto";

export type MarcaFiltro = "" | "casa-lorenzi" | "vulto";

export const MARCAS_FILTRO: { valor: MarcaFiltro; rotulo: string }[] = [
  { valor: "", rotulo: "Todas" },
  { valor: "casa-lorenzi", rotulo: "Casa Lorenzi" },
  { valor: "vulto", rotulo: "Vulto" },
];

export const daMarca = (produto: Pick<Produto, "marca">, marca: MarcaFiltro) =>
  !marca || (marca === "vulto" ? ehVulto(produto) : !ehVulto(produto));

export type MovimentoPontos = { ocorrido_em: string; tipo: string; pontos: number; descricao: string };

export type VultoMais = {
  saldo: number;
  categoria: string;
  creditos_no_ano: number;
  proxima_categoria: string | null;
  faltam_para_proxima: number | null;
  extrato: MovimentoPontos[];
};

export function validarVultoMais(dados: unknown): VultoMais {
  const o = objeto(dados, "vulto_mais");
  return {
    saldo: numero(o.saldo, "saldo"),
    categoria: texto(o.categoria, "categoria"),
    creditos_no_ano: numero(o.creditos_no_ano, "creditos_no_ano"),
    proxima_categoria: textoOuNulo(o.proxima_categoria, "proxima_categoria"),
    faltam_para_proxima: numeroOuNulo(o.faltam_para_proxima ?? null, "faltam_para_proxima"),
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
