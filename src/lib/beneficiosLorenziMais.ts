import { lista, numero, objeto, texto } from "./validacao";

/**
 * Benefícios das categorias do Lorenzi+ (espelha app/cliente/beneficios.py, que é a regra que vale):
 * prata tem frete grátis a partir de R$ 600; ouro, frete grátis sempre e acesso antecipado às
 * coleções; black, tudo isso e o serviço de ajuste como cortesia.
 */

export type Beneficio = { codigo: string; titulo: string; descricao: string };

export type BeneficiosLorenziMais = {
  beneficios: Beneficio[];
  proximos_beneficios: Beneficio[];
  /** Valor em peças a partir do qual a entrega sai de graça (0 = sempre); nulo = regra da loja. */
  frete_gratis_a_partir: number | null;
};

const beneficio = (v: unknown, campo: string): Beneficio => {
  const o = objeto(v, campo);
  return { codigo: texto(o.codigo, `${campo}.codigo`), titulo: texto(o.titulo, `${campo}.titulo`), descricao: texto(o.descricao, `${campo}.descricao`) };
};

/** Resposta sem os campos (backend antigo) vale como "sem benefícios". */
export function validarBeneficios(o: Record<string, unknown>): BeneficiosLorenziMais {
  const listaDe = (v: unknown, campo: string) => (v === undefined || v === null ? [] : lista(v, campo).map((b, i) => beneficio(b, `${campo}.${i}`)));
  const frete = o.frete_gratis_a_partir;
  return {
    beneficios: listaDe(o.beneficios, "beneficios"),
    proximos_beneficios: listaDe(o.proximos_beneficios, "proximos_beneficios"),
    frete_gratis_a_partir: frete === undefined || frete === null ? null : numero(typeof frete === "string" ? Number(frete) : frete, "frete_gratis_a_partir"),
  };
}

export const NOMES_DAS_CATEGORIAS: Record<string, string> = { bronze: "Bronze", prata: "Prata", ouro: "Ouro", black: "Black" };

export const nomeDaCategoria = (codigo: string | null | undefined) =>
  codigo ? (NOMES_DAS_CATEGORIAS[codigo] ?? codigo.charAt(0).toUpperCase() + codigo.slice(1)) : "";
