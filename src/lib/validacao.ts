/**
 * Validação do formato das respostas da API. Nada que o servidor mande chega cru às telas: cada
 * campo é conferido e só o que foi combinado é repassado (campo extra, como e-mail que não
 * deveria estar ali, é descartado).
 */

export const falha = (campo: string): never => {
  throw new Error(`campo inválido: ${campo}`);
};

export function objeto(valor: unknown, campo: string): Record<string, unknown> {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : falha(campo);
}

export const lista = (valor: unknown, campo: string): unknown[] => (Array.isArray(valor) ? valor : falha(campo));
export const texto = (valor: unknown, campo: string): string => (typeof valor === "string" ? valor : falha(campo));
export const numero = (valor: unknown, campo: string): number =>
  typeof valor === "number" && Number.isFinite(valor) ? valor : falha(campo);
export const numeroOuNulo = (valor: unknown, campo: string): number | null =>
  valor === null ? null : numero(valor, campo);
export const textoOuNulo = (valor: unknown, campo: string): string | null =>
  valor === null || valor === undefined ? null : texto(valor, campo);
export const booleano = (valor: unknown, campo: string): boolean =>
  typeof valor === "boolean" ? valor : falha(campo);

export type Opcao = { codigo: string; nome: string };

export function opcao(valor: unknown, campo: string): Opcao {
  const o = objeto(valor, campo);
  return { codigo: texto(o.codigo, `${campo}.codigo`), nome: texto(o.nome, `${campo}.nome`) };
}
