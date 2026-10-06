import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { cn } from "@/components/ui";
import { CartaoProduto, FichaTecnica, Foto, Legenda, NomePeca, Preco, botaoLoja, parcela } from "@/components/vitrine";
import { skuVariacao, tamanhosPorCategoria, totalProduto } from "@/lib/dados";
import { detalheDe, fotoEstudio, fotoVestida } from "@/lib/loja";
import { adicionarAoCarrinho, useEstado } from "@/lib/store";

export function Produto() {
  const { sku = "" } = useParams();
  // A chave reinicia tamanho/cor/quantidade ao navegar para outra peça.
  return <DetalheProduto key={sku} sku={sku} />;
}

function DetalheProduto({ sku }: { sku: string }) {
  const { produtos } = useEstado();
  const produto = produtos.find((p) => p.sku === sku);
  const d = detalheDe(sku);
  const tamanhos = (produto && tamanhosPorCategoria[produto.categoria]) ?? ["Único"];
  const [tamanho, setTamanho] = useState(tamanhos.length === 1 ? tamanhos[0]! : "");
  const [cor, setCor] = useState(d.cores[0]!);
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
  const vestida = fotoVestida(produto.sku, 1400);
  const combina = produtos
    .filter((p) => p.sku !== produto.sku && p.categoria !== produto.categoria && totalProduto(p) > 0)
    .slice(0, 3);

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
    <div className="mx-auto max-w-[1360px] px-5 pt-8 md:px-12">
      <nav className="mb-6 text-sm text-suave">
        <Link to="/loja" className="link-tracejado">
          Pronta-entrega
        </Link>
        <span className="mx-2">·</span>
        <Link to={`/loja?categoria=${produto.categoria}`} className="hover:text-tinta">
          {produto.categoria}
        </Link>
      </nav>

      <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
        {/* Fotos: vestida, estúdio e detalhe */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Foto src={vestida ?? fotoEstudio(produto.sku)} alt={produto.nome} className="aspect-[4/5]" />
          </div>
          <div className="aspect-square overflow-hidden bg-[#ece3d3]">
            <img src={fotoEstudio(produto.sku)} alt="" className="h-full w-full object-contain p-5" />
          </div>
          <Foto src={vestida ?? fotoEstudio(produto.sku)} className="aspect-square [&_img]:scale-[1.9] [&_img]:object-[center_35%]" />
          <Legenda className="col-span-2">Foto da campanha da edição; ao lado, a peça no ateliê e um detalhe do tecido.</Legenda>
        </div>

        <div className="lg:sticky lg:top-8 lg:self-start">
          <h1 className="text-[40px] leading-[1.05] md:text-[48px]">
            <NomePeca produto={produto} />
          </h1>
          <div className="mt-5 flex items-center gap-4">
            <Preco valor={produto.preco} />
            <span className="text-sm text-suave">{parcela(produto.preco)} sem juros</span>
          </div>
          <p className="mt-6 font-display text-[20px] leading-normal">{d.nota}</p>

          <div className="alinhavo mt-8 pt-6">
            <p className="mb-3 text-sm text-suave">
              Cor: <span className="text-tinta">{cor.nome}</span>
            </p>
            <div className="flex gap-3">
              {d.cores.map((c) => (
                <button
                  key={c.nome}
                  onClick={() => setCor(c)}
                  aria-label={c.nome}
                  title={c.nome}
                  className={cn(
                    "h-10 w-10 rounded-full border-[1.5px] p-[3px] transition-colors",
                    cor.nome === c.nome ? "border-dashed border-tinta" : "border-transparent hover:border-linha",
                  )}
                >
                  <span className="block h-full w-full rounded-full border border-black/10" style={{ background: c.hex }} />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-7">
            <div className="mb-3 flex items-center justify-between text-sm">
              <p className="text-suave">Tamanho</p>
              <Link to={`/agendar?peca=${produto.sku}`} className="link-tracejado">
                Na dúvida, prove na loja
              </Link>
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
                      tamanho === t ? "border-tinta bg-tinta text-creme" : "border-linha bg-pergaminho hover:border-tinta",
                      sem && "cursor-not-allowed text-suave/50 line-through",
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            {aviso ? <p className="mt-2 text-sm text-perigo">Escolha um tamanho — a barra e as mangas a gente ajusta depois.</p> : null}
            {tamanho && restantes > 0 && restantes <= 5 ? (
              <p className="mt-3 text-sm text-caramelo">
                {restantes === 1 ? "Última peça" : `Restam ${restantes} peças`} no {tamanho} desta edição.
              </p>
            ) : null}
          </div>

          <div className="mt-8 flex gap-3">
            <div className="flex items-center border border-linha bg-pergaminho">
              <button onClick={() => setQuantidade((q) => Math.max(1, q - 1))} className="px-3 py-3 text-suave hover:text-tinta" aria-label="Diminuir quantidade">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-sm">{quantidade}</span>
              <button onClick={() => setQuantidade((q) => q + 1)} className="px-3 py-3 text-suave hover:text-tinta" aria-label="Aumentar quantidade">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button onClick={adicionar} disabled={disponivel === 0} className={cn(botaoLoja(), "flex-1")}>
              {disponivel === 0 ? "Esgotada — volta na próxima edição" : "Levar para a sacola"}
            </button>
          </div>

          {adicionado ? (
            <div className="mt-4 flex items-center justify-between gap-4 bg-pergaminho px-4 py-3 text-sm">
              <span className="font-mao text-[14px] leading-relaxed text-caramelo">Separada para você.</span>
              <Link to="/sacola" className="link-tracejado">
                Ver a sacola
              </Link>
            </div>
          ) : null}

          <ul className="mt-8 space-y-0 text-[15px]">
            {[
              ["Ajuste", "Barra e mangas feitas na hora, em qualquer casa, sem custo."],
              ["Entrega", "Grátis acima de R$ 1.000, ou retire numa das três casas."],
              ["Troca", "A primeira é por nossa conta, em até 30 dias."],
            ].map(([k, v]) => (
              <li key={k} className="alinhavo grid grid-cols-[90px_1fr] py-3">
                <span className="text-suave">{k}</span>
                {v}
              </li>
            ))}
          </ul>

          <div className="mt-10">
            <FichaTecnica produto={produto} tamanho={tamanho || undefined} />
          </div>

          <Link to={`/conta/atendimento/novo?sku=${produto.sku}`} className="link-tracejado mt-8 inline-block text-sm">
            Pergunte ao alfaiate sobre esta peça
          </Link>
        </div>
      </div>

      {combina.length ? (
        <section className="pt-28">
          <h2 className="mb-8 text-[40px]">Vai bem com</h2>
          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {combina.map((p) => (
              <CartaoProduto key={p.sku} produto={p} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
