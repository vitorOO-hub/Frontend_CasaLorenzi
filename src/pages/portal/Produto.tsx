import { Check, MessageCircle, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { cn } from "@/components/ui";
import { CartaoProduto, FotoProduto, parcela } from "@/components/vitrine";
import {
  coresPorCategoria,
  descricaoProduto,
  moeda,
  skuVariacao,
  tamanhosPorCategoria,
  totalProduto,
} from "@/lib/dados";
import { adicionarAoCarrinho, useEstado } from "@/lib/store";

export function Produto() {
  const { sku = "" } = useParams();
  // A chave reinicia tamanho/cor/quantidade ao navegar para outra peça.
  return <DetalheProduto key={sku} sku={sku} />;
}

function DetalheProduto({ sku }: { sku: string }) {
  const { produtos } = useEstado();
  const produto = produtos.find((p) => p.sku === sku);

  const tamanhos = (produto && tamanhosPorCategoria[produto.categoria]) ?? ["Único"];
  const cores = (produto && coresPorCategoria[produto.categoria]) ?? [{ nome: "Preto", hex: "#1a1a1a" }];
  const [tamanho, setTamanho] = useState(tamanhos.length === 1 ? tamanhos[0]! : "");
  const [cor, setCor] = useState(cores[0]!);
  const [quantidade, setQuantidade] = useState(1);
  const [adicionado, setAdicionado] = useState(false);
  const [aviso, setAviso] = useState(false);

  if (!produto) return <Navigate to="/loja" replace />;

  const disponivel = totalProduto(produto);
  // Distribui o saldo total entre os tamanhos de forma determinística (protótipo).
  const estoqueDo = (t: string) => {
    if (tamanhos.length === 1) return disponivel;
    const i = tamanhos.indexOf(t);
    return Math.floor(disponivel / tamanhos.length) + (i < disponivel % tamanhos.length ? 1 : 0);
  };
  const restantes = tamanho ? estoqueDo(tamanho) : disponivel;
  const relacionados = produtos
    .filter((p) => p.categoria === produto.categoria && p.sku !== produto.sku)
    .concat(produtos.filter((p) => p.categoria !== produto.categoria))
    .slice(0, 4);

  function adicionar() {
    if (!tamanho) {
      setAviso(true);
      return;
    }
    adicionarAoCarrinho({
      sku: skuVariacao(produto!.sku, tamanho, cor.nome),
      skuBase: produto!.sku,
      nome: produto!.nome,
      quantidade,
      valor: produto!.preco,
      tamanho,
      cor: cor.nome,
    });
    setAdicionado(true);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 md:px-8">
      <nav className="mb-6 text-xs text-suave">
        <Link to="/" className="hover:text-marinho">
          Início
        </Link>
        <span className="mx-2">/</span>
        <Link to={`/loja?categoria=${produto.categoria}`} className="hover:text-marinho">
          {produto.categoria}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-tinta">{produto.nome}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <div className="grid grid-cols-2 gap-3">
          <FotoProduto sku={produto.sku} alt={produto.nome} className="col-span-2 aspect-[4/5]" />
          {(["top", "bottom"] as const).map((pos) => (
            <div key={pos} className="aspect-square overflow-hidden bg-areia">
              <FotoProduto
                sku={produto.sku}
                alt=""
                className={cn("h-full scale-150", pos === "top" ? "[&_img]:object-top" : "[&_img]:object-bottom")}
              />
            </div>
          ))}
        </div>

        <div className="lg:sticky lg:top-40 lg:self-start">
          <p className="rotulo !text-dourado">{produto.categoria}</p>
          <h1 className="mt-2 text-4xl font-light leading-tight md:text-5xl">{produto.nome}</h1>
          <p className="mt-4 text-xl text-tinta">{moeda(produto.preco)}</p>
          <p className="text-sm text-suave">{parcela(produto.preco)} sem juros</p>

          <div className="mt-8">
            <p className="rotulo mb-3">
              Cor: <span className="normal-case tracking-normal text-tinta">{cor.nome}</span>
            </p>
            <div className="flex gap-3">
              {cores.map((c) => (
                <button
                  key={c.nome}
                  onClick={() => setCor(c)}
                  aria-label={c.nome}
                  title={c.nome}
                  className={cn(
                    "h-9 w-9 rounded-full border-2 p-0.5 transition-colors",
                    cor.nome === c.nome ? "border-marinho" : "border-transparent hover:border-linha",
                  )}
                >
                  <span
                    className="block h-full w-full rounded-full border border-black/10"
                    style={{ background: c.hex }}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-7">
            <div className="mb-3 flex items-center justify-between">
              <p className="rotulo">Tamanho</p>
              <span className="text-xs text-suave underline underline-offset-4">Guia de medidas</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {tamanhos.map((t) => {
                const sem = estoqueDo(t) === 0;
                return (
                  <button
                    key={t}
                    disabled={sem}
                    onClick={() => {
                      setTamanho(t);
                      setAviso(false);
                      setAdicionado(false);
                    }}
                    className={cn(
                      "min-w-14 border px-4 py-2.5 text-sm transition-colors",
                      tamanho === t
                        ? "border-marinho bg-marinho text-white"
                        : "border-linha bg-papel hover:border-marinho",
                      sem && "cursor-not-allowed text-suave/50 line-through",
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            {aviso ? <p className="mt-2 text-sm text-perigo">Escolha um tamanho para continuar.</p> : null}
            {tamanho && restantes > 0 && restantes <= 5 ? (
              <p className="mt-3 text-sm text-alerta">
                {restantes === 1 ? "Última unidade" : `Últimas ${restantes} unidades`} no tamanho {tamanho}
              </p>
            ) : null}
          </div>

          <div className="mt-8 flex gap-3">
            <div className="flex items-center border border-linha bg-papel">
              <button
                onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                className="px-3 py-3 text-suave hover:text-tinta"
                aria-label="Diminuir quantidade"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-sm">{quantidade}</span>
              <button
                onClick={() => setQuantidade((q) => q + 1)}
                className="px-3 py-3 text-suave hover:text-tinta"
                aria-label="Aumentar quantidade"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={adicionar}
              disabled={disponivel === 0}
              className="flex-1 bg-marinho py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-marinho-escuro disabled:bg-suave/40"
            >
              {disponivel === 0 ? "Esgotado" : "Adicionar à sacola"}
            </button>
          </div>

          {adicionado ? (
            <div className="mt-4 flex items-center justify-between gap-4 border border-sucesso/30 bg-sucesso/5 px-4 py-3 text-sm">
              <span className="flex items-center gap-2 text-sucesso">
                <Check className="h-4 w-4" /> Adicionado à sacola
              </span>
              <Link to="/sacola" className="font-semibold text-marinho underline underline-offset-4">
                Ver sacola
              </Link>
            </div>
          ) : null}

          <Link
            to={`/conta/atendimento/novo?sku=${produto.sku}`}
            className="mt-5 flex items-center gap-2 text-sm text-suave hover:text-marinho"
          >
            <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
            Dúvida sobre esta peça? Fale com um consultor
          </Link>

          <div className="mt-8 border-t border-linha">
            {[
              ["Descrição", descricaoProduto(produto.nome, produto.categoria)],
              [
                "Composição e cuidados",
                "Fibras naturais selecionadas. Lavar a seco ou à mão em água fria; secar à sombra e passar em temperatura média pelo avesso.",
              ],
              [
                "Entrega, trocas e ajustes",
                "Frete grátis acima de R$ 1.000. Primeira troca gratuita em até 30 dias. Ajustes de barra, manga e cintura sem custo em qualquer uma das nossas casas.",
              ],
            ].map(([titulo, texto], i) => (
              <details key={titulo} open={i === 0} className="group border-b border-linha py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-bold uppercase tracking-[0.18em]">
                  {titulo}
                  <Plus className="h-4 w-4 text-suave transition-transform group-open:rotate-45" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-suave">{texto}</p>
              </details>
            ))}
          </div>
          <p className="mt-4 font-mono text-[10px] text-suave/70">
            Ref. {tamanho ? skuVariacao(produto.sku, tamanho, cor.nome) : produto.sku}
          </p>
        </div>
      </div>

      <section className="mt-24">
        <h2 className="mb-10 text-center text-4xl font-light">Combine com</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
          {relacionados.map((p) => (
            <CartaoProduto key={p.sku} produto={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
