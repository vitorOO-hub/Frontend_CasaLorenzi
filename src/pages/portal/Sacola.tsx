import { Minus, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/components/ui";
import { Foto, botaoLoja } from "@/components/vitrine";
import { moeda } from "@/lib/dados";
import { detalheDe, fotoEstudio, fotoVestida } from "@/lib/loja";
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
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="text-[56px] leading-none">A sacola está vazia.</h1>
        <p className="mt-4 font-display text-xl text-suave">A Edição 64 tem dezoito peças, e algumas já estão nas últimas unidades.</p>
        <Link to="/loja" className={cn(botaoLoja(), "mt-10")}>
          Ver a Edição 64
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1180px] px-5 pt-10 md:px-12">
      <h1 className="mb-10 text-[56px] leading-none md:text-[64px]">Sua sacola</h1>

      <div className="grid gap-12 lg:grid-cols-[1fr_24rem]">
        <ul>
          {carrinho.map((i) => {
            const d = detalheDe(i.skuBase);
            return (
              <li key={i.sku} className="alinhavo flex gap-5 py-6">
                <Link to={`/loja/${i.skuBase}`} className="w-24 shrink-0 md:w-32">
                  <Foto src={fotoVestida(i.skuBase, 400) ?? fotoEstudio(i.skuBase)} alt={i.nome} className="aspect-[3/4]" />
                </Link>
                <div className="flex flex-1 flex-col">
                  <div className="flex justify-between gap-4">
                    <div>
                      <Link to={`/loja/${i.skuBase}`} className="font-display text-[22px] leading-tight hover:text-caramelo">
                        {i.nome} <em className="text-suave">{d.tecido}</em>
                      </Link>
                      <p className="mt-1 text-sm text-suave">
                        {i.cor} · tamanho {i.tamanho}
                      </p>
                    </div>
                    <button onClick={() => alterarQuantidadeCarrinho(i.sku, 0)} className="h-fit text-sm text-suave hover:text-perigo">
                      Tirar
                    </button>
                  </div>
                  <div className="mt-auto flex items-end justify-between pt-4">
                    <div className="flex items-center border border-linha bg-pergaminho">
                      <button onClick={() => alterarQuantidadeCarrinho(i.sku, i.quantidade - 1)} className="px-2.5 py-2 text-suave hover:text-tinta" aria-label="Diminuir">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-7 text-center text-sm">{i.quantidade}</span>
                      <button onClick={() => alterarQuantidadeCarrinho(i.sku, i.quantidade + 1)} className="px-2.5 py-2 text-suave hover:text-tinta" aria-label="Aumentar">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p>{moeda(i.valor * i.quantidade)}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="costurado h-fit bg-pergaminho p-8 text-tinta">
          <h2 className="text-[28px]">Resumo</h2>
          <dl className="mt-5 space-y-2.5 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-suave">Peças</dt>
              <dd>{moeda(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-suave">Entrega</dt>
              <dd>{frete === 0 ? "por nossa conta" : moeda(frete)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-suave">Ajustes</dt>
              <dd>por nossa conta</dd>
            </div>
          </dl>
          {falta > 0 ? (
            <p className="mt-4 font-mao text-xl leading-tight text-caramelo">Faltam {moeda(falta)} para a entrega sair por nossa conta.</p>
          ) : null}
          <div className="alinhavo mt-5 flex items-baseline justify-between pt-5">
            <span>Total</span>
            <span className="font-display text-[34px]">{moeda(subtotal + frete)}</span>
          </div>
          <p className="text-right text-xs text-suave">ou 10x de {moeda((subtotal + frete) / 10)} sem juros</p>
          <Link to="/checkout" className={cn(botaoLoja(), "mt-6 w-full")}>
            Fechar o pedido
          </Link>
          <Link to="/loja" className="link-tracejado mx-auto mt-4 block w-fit text-sm">
            Continuar olhando
          </Link>
        </aside>
      </div>
    </div>
  );
}
