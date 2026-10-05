import { Minus, Plus, X } from "lucide-react";
import { Link } from "react-router-dom";
import { FotoProduto } from "@/components/vitrine";
import { moeda } from "@/lib/dados";
import { alterarQuantidadeCarrinho, useEstado } from "@/lib/store";

export const FRETE_GRATIS_A_PARTIR = 1000;
export const FRETE_PADRAO = 49;
export const freteDe = (subtotal: number) => (subtotal >= FRETE_GRATIS_A_PARTIR ? 0 : FRETE_PADRAO);

export function Sacola() {
  const { carrinho } = useEstado();
  const subtotal = carrinho.reduce((s, i) => s + i.valor * i.quantidade, 0);
  const frete = freteDe(subtotal);
  const falta = FRETE_GRATIS_A_PARTIR - subtotal;

  if (carrinho.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="filete mx-auto mb-6" />
        <h1 className="text-4xl font-light">Sua sacola está vazia</h1>
        <p className="mt-3 text-sm text-suave">Que tal começar pela nossa alfaiataria?</p>
        <Link
          to="/loja"
          className="mt-8 inline-block bg-marinho px-10 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white hover:bg-marinho-escuro"
        >
          Explorar a coleção
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 md:px-8">
      <h1 className="mb-10 text-center text-5xl font-light">Sacola</h1>

      <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
        <ul className="divide-y divide-linha border-y border-linha">
          {carrinho.map((i) => (
            <li key={i.sku} className="flex gap-5 py-6">
              <Link to={`/loja/${i.skuBase}`} className="w-24 shrink-0 md:w-28">
                <FotoProduto sku={i.skuBase} alt={i.nome} className="aspect-[4/5]" />
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex justify-between gap-4">
                  <div>
                    <Link to={`/loja/${i.skuBase}`} className="font-display text-xl hover:text-marinho">
                      {i.nome}
                    </Link>
                    <p className="mt-1 text-xs text-suave">
                      Tamanho {i.tamanho} · {i.cor}
                    </p>
                  </div>
                  <button
                    onClick={() => alterarQuantidadeCarrinho(i.sku, 0)}
                    className="h-fit text-suave hover:text-perigo"
                    aria-label={`Remover ${i.nome}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-auto flex items-end justify-between pt-4">
                  <div className="flex items-center border border-linha bg-papel">
                    <button
                      onClick={() => alterarQuantidadeCarrinho(i.sku, i.quantidade - 1)}
                      className="px-2.5 py-2 text-suave hover:text-tinta"
                      aria-label="Diminuir"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-7 text-center text-sm">{i.quantidade}</span>
                    <button
                      onClick={() => alterarQuantidadeCarrinho(i.sku, i.quantidade + 1)}
                      className="px-2.5 py-2 text-suave hover:text-tinta"
                      aria-label="Aumentar"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-sm">{moeda(i.valor * i.quantidade)}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit bg-papel p-6">
          <p className="rotulo">Resumo</p>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-suave">Subtotal</dt>
              <dd>{moeda(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-suave">Frete</dt>
              <dd>{frete === 0 ? <span className="text-sucesso">Grátis</span> : moeda(frete)}</dd>
            </div>
          </dl>
          {falta > 0 ? (
            <p className="mt-4 bg-dourado-claro px-3 py-2 text-xs text-tinta">
              Faltam {moeda(falta)} para o frete grátis.
            </p>
          ) : null}
          <div className="mt-5 flex items-baseline justify-between border-t border-linha pt-5">
            <span className="text-sm">Total</span>
            <span className="font-display text-3xl text-marinho">{moeda(subtotal + frete)}</span>
          </div>
          <p className="mt-1 text-right text-xs text-suave">
            ou 10x de {moeda((subtotal + frete) / 10)} sem juros
          </p>
          <Link
            to="/checkout"
            className="mt-6 block bg-marinho py-3.5 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-white hover:bg-marinho-escuro"
          >
            Finalizar compra
          </Link>
          <Link to="/loja" className="mt-3 block text-center text-xs text-suave hover:text-marinho">
            Continuar comprando
          </Link>
        </aside>
      </div>
    </div>
  );
}
