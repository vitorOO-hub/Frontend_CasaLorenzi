import { numero, objeto } from "./validacao";

/**
 * Regras do Lorenzi+ que o site mostra (o backend manda em GET /cliente/vulto-mais e confere tudo no
 * checkout): R$ 5 de desconto a cada 100 pontos, resgate em múltiplos de 100, R$ 1 = 1 ponto na loja
 * e 2 no site, arredondando depois de multiplicar (meio vai para o par, como no backend).
 */

export type RegrasLorenziMais = {
  reais_a_cada_100_pontos: number;
  multiplo_de_resgate: number;
  pontos_por_real_loja: number;
  pontos_por_real_online: number;
};

export const REGRAS_PADRAO: RegrasLorenziMais = {
  reais_a_cada_100_pontos: 5,
  multiplo_de_resgate: 100,
  pontos_por_real_loja: 1,
  pontos_por_real_online: 2,
};

/** Resposta sem regras (backend antigo) usa as do programa. */
export function validarRegras(valor: unknown): RegrasLorenziMais {
  if (valor === null || valor === undefined) return REGRAS_PADRAO;
  const o = objeto(valor, "regras");
  const n = (v: unknown, c: string) => numero(typeof v === "string" ? Number(v) : v, `regras.${c}`);
  return {
    reais_a_cada_100_pontos: n(o.reais_a_cada_100_pontos, "reais_a_cada_100_pontos"),
    multiplo_de_resgate: n(o.multiplo_de_resgate, "multiplo_de_resgate"),
    pontos_por_real_loja: n(o.pontos_por_real_loja, "pontos_por_real_loja"),
    pontos_por_real_online: n(o.pontos_por_real_online, "pontos_por_real_online"),
  };
}

/** Pontos que uma compra rende. Conta em centavos para não errar no arredondamento. */
export function pontosDaCompra(valor: number, online: boolean, regras = REGRAS_PADRAO): number {
  const centavos = Math.round(Math.max(valor, 0) * 100) * (online ? regras.pontos_por_real_online : regras.pontos_por_real_loja);
  const inteiro = Math.floor(centavos / 100);
  const resto = centavos % 100;
  if (resto > 50) return inteiro + 1;
  if (resto < 50) return inteiro;
  return inteiro + (inteiro % 2);
}

export const descontoDosPontos = (pontos: number, regras = REGRAS_PADRAO) => (pontos / 100) * regras.reais_a_cada_100_pontos;

/** O máximo que dá para resgatar: cabe no saldo e o desconto não passa do valor das peças. */
export function maximoResgatavel(saldo: number, valorDasPecas: number, regras = REGRAS_PADRAO): number {
  const m = regras.multiplo_de_resgate;
  const peloSaldo = Math.floor(Math.max(saldo, 0) / m) * m;
  const pelasPecas = Math.floor((Math.max(valorDasPecas, 0) * 100) / regras.reais_a_cada_100_pontos / m) * m;
  return Math.min(peloSaldo, pelasPecas);
}
