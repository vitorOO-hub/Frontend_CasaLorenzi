import type { Produto } from "./dados";
import { grupoDaLoja } from "./lojasAgrupadas";
import type { ItemCarrinho } from "./store";

/** Loja onde o cliente retira: as lojas das duas marcas, sem o e-commerce, o CD e os canais antigos. */
export function lojaFisica(nome: string) {
  const grupo = grupoDaLoja(nome);
  const generica = ["casa lorenzi", "vulto"].includes(nome.trim().toLowerCase());
  return (grupo === "Casa Lorenzi" || grupo === "Vulto") && !generica;
}

/** A loja tem todas as peças da sacola na quantidade pedida (estoque do catálogo). */
export function temTudo(idLoja: string, carrinho: ItemCarrinho[], produtos: Produto[]) {
  const saldo = new Map<string, number>();
  for (const p of produtos)
    for (const v of p.variacoes ?? []) {
      const q = v.estoque?.find((e) => e.lojaId === idLoja)?.quantidade ?? 0;
      if (v.idVariacao) saldo.set(v.idVariacao, q);
      saldo.set(v.sku, q);
    }
  return carrinho.every((item) => (saldo.get(item.idVariacao ?? "") ?? saldo.get(item.sku) ?? 0) >= item.quantidade);
}
