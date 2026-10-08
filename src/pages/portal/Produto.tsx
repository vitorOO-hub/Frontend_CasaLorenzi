import { Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { cn } from "@/components/ui";
import { CartaoProduto, FichaTecnica, Foto, Legenda, NomePeca, Preco, botaoLoja, parcela } from "@/components/vitrine";
import { produtoTemEstoque, skuVariacao, tamanhosPorCategoria, totalProduto, totalVariacao } from "@/lib/dados";
import { detalheDe, fotoEstudio, fotoVestida, type CorDaCasa } from "@/lib/loja";
import { useProdutosCatalogo } from "@/lib/catalogoApi";
import * as acoes from "@/lib/acoes";
import { useEstado } from "@/lib/store";

export function Produto() {
  const { sku = "" } = useParams();
  // A chave reinicia tamanho/cor/quantidade ao navegar para outra peça.
  return <DetalheProduto key={sku} sku={sku} />;
}

function DetalheProduto({ sku }: { sku: string }) {
  const estado = useEstado();
  const { produtos, carregando } = useProdutosCatalogo(estado.produtos);
  const produto = produtos.find((p) => p.sku === sku || p.variacoes?.some((variacao) => variacao.sku === sku));
  const variacoes = useMemo(() => produto?.variacoes ?? [], [produto?.variacoes]);
  const d = detalheDe(produto?.sku ?? sku);
  const tamanhos = useMemo(() => {
    const tamanhosApi = Array.from(new Set(variacoes.map((variacao) => variacao.tamanho).filter(Boolean))).sort();
    return tamanhosApi.length ? tamanhosApi : ((produto && tamanhosPorCategoria[produto.categoria]) ?? ["Único"]);
  }, [produto, variacoes]);
  const cores = useMemo<CorDaCasa[]>(() => {
    const nomes = Array.from(new Set(variacoes.map((variacao) => variacao.cor).filter(Boolean))).sort();
    if (nomes.length === 0) return produto?.cores?.length ? produto.cores : d.cores;
    return nomes.map((nome, indice) => ({
      nome,
      hex: produto?.cores?.[indice]?.hex ?? d.cores[indice]?.hex ?? d.cores[0]?.hex ?? "#1b2a4a",
    }));
  }, [d.cores, produto?.cores, variacoes]);
  const [tamanho, setTamanho] = useState(tamanhos.length === 1 ? tamanhos[0]! : "");
  const [cor, setCor] = useState<CorDaCasa>(cores[0]!);
  const [quantidade, setQuantidade] = useState(1);
  const [adicionado, setAdicionado] = useState(false);
  const [aviso, setAviso] = useState(false);
  const tamanhoSelecionado = tamanhos.includes(tamanho) ? tamanho : tamanhos.length === 1 ? tamanhos[0]! : "";
  const corSelecionada = cores.find((item) => item.nome === cor.nome) ?? cores[0]!;

  if (!produto) {
    if (carregando) {
      return <p className="px-5 py-24 text-center font-display text-2xl text-suave">Carregando peça...</p>;
    }
    return <Navigate to="/loja" replace />;
  }

  const disponivel = totalProduto(produto);
  const estoqueDo = (t: string) => {
    if (variacoes.length) {
      return variacoes
        .filter((variacao) => variacao.tamanho === t && variacao.cor === corSelecionada.nome)
        .reduce((s, variacao) => s + (totalVariacao(variacao) ?? 0), 0);
    }
    if (tamanhos.length === 1) return produtoTemEstoque(produto) ? Math.max(disponivel, 1) : 0;
    const i = tamanhos.indexOf(t);
    return Math.floor(disponivel / tamanhos.length) + (i < disponivel % tamanhos.length ? 1 : 0);
  };
  const restantes = tamanhoSelecionado ? estoqueDo(tamanhoSelecionado) : disponivel;
  const variacaoSelecionada = variacoes.find((item) => item.tamanho === tamanhoSelecionado && item.cor === corSelecionada.nome);
  const podeAdicionar = tamanhoSelecionado && restantes > 0 && quantidade <= restantes;
  const fotoPrincipal = produto.imagemUrl ?? fotoEstudio(produto.sku);
  const fotoPrincipalAlt = produto.imagemAlt ?? produto.nome;
  const vestida = produto.imagemVestidaUrl ?? fotoVestida(produto.sku, 1400);
  const combina = produtos
    .filter((p) => p.sku !== produto.sku && p.categoria !== produto.categoria && produtoTemEstoque(p))
    .slice(0, 3);

  function adicionar() {
    if (!tamanhoSelecionado) {
      setAviso(true);
      return;
    }
    if (!podeAdicionar) {
      setAviso(true);
      return;
    }
    void acoes.adicionarAoCarrinho({
      idVariacao: variacaoSelecionada?.idVariacao,
      sku: variacaoSelecionada?.sku ?? skuVariacao(produto!.sku, tamanhoSelecionado, corSelecionada.nome),
      skuBase: produto!.sku,
      nome: produto!.nome,
      quantidade,
      valor: variacaoSelecionada?.preco ?? produto!.preco,
      tamanho: tamanhoSelecionado,
      cor: corSelecionada.nome,
      imagemUrl: produto!.imagemUrl,
      imagemAlt: produto!.imagemAlt ?? produto!.nome,
      tecido: produto!.tecido,
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

      <div className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
        {/* Fotos: a peça sozinha, a peça vestida e um detalhe */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 aspect-[4/5] overflow-hidden bg-areia">
            <img src={fotoPrincipal} alt={fotoPrincipalAlt} className="h-full w-full object-contain" />
          </div>
          {vestida ? (
            <>
              <Foto src={vestida} alt={`${produto.nome} vestida`} className="aspect-[4/5]" />
              <Foto src={vestida} className="aspect-[4/5] [&_img]:scale-[1.9] [&_img]:object-[center_40%]" />
              <Legenda className="col-span-2">A peça no fundo neutro, vestida e de perto.</Legenda>
            </>
          ) : null}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <h1 className="text-[40px] leading-[1.05] md:text-[48px]">
            <NomePeca produto={produto} />
          </h1>
          <div className="mt-5 flex items-center gap-4">
            <Preco valor={produto.preco} />
            <span className="text-sm text-suave">{parcela(produto.preco)} sem juros</span>
          </div>
          <p className="mt-6 font-display text-[20px] leading-normal">{produto.nota ?? d.nota}</p>

          <div className="alinhavo mt-8 pt-6">
            <p className="mb-3 text-sm text-suave">
              Cor: <span className="text-tinta">{corSelecionada.nome}</span>
            </p>
            <div className="flex gap-3">
              {cores.map((c) => (
                <button
                  key={c.nome}
                  onClick={() => {
                    setCor(c);
                    setQuantidade(1);
                    setAviso(false);
                    setAdicionado(false);
                  }}
                  aria-label={c.nome}
                  title={c.nome}
                  className={cn(
                    "h-10 w-10 rounded-full border-[1.5px] p-[3px] transition-colors",
                    corSelecionada.nome === c.nome ? "border-dashed border-tinta" : "border-transparent hover:border-linha",
                  )}
                >
                  <span className="block h-full w-full rounded-full border border-tinta/15" style={{ background: c.hex }} />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-7">
            <p className="mb-3 text-sm text-suave">Tamanho</p>
            <div className="flex flex-wrap gap-2">
              {tamanhos.map((t) => {
                const sem = estoqueDo(t) === 0;
                return (
                  <button
                    key={t}
                    disabled={sem}
                    onClick={() => {
                      setTamanho(t);
                      setQuantidade(1);
                      setAviso(false);
                      setAdicionado(false);
                    }}
                    className={cn(
                      "min-w-14 border px-4 py-2.5 text-sm transition-colors",
                      tamanhoSelecionado === t ? "border-tinta bg-tinta text-creme" : "border-linha bg-pergaminho hover:border-tinta",
                      sem && "cursor-not-allowed text-suave/50 line-through",
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            {aviso ? <p className="mt-2 text-sm text-perigo">Escolha um tamanho — a barra e as mangas a gente ajusta depois.</p> : null}
            {tamanhoSelecionado && restantes > 0 && restantes <= 5 ? (
              <p className="mt-3 text-sm text-caramelo">
                {restantes === 1 ? "Última peça" : `Restam ${restantes} peças`} no {tamanhoSelecionado} desta edição.
              </p>
            ) : null}
          </div>

          <div className="mt-8 flex gap-3">
            <div className="flex items-center border border-linha bg-pergaminho">
              <button onClick={() => setQuantidade((q) => Math.max(1, q - 1))} className="px-3 py-3 text-suave hover:text-tinta" aria-label="Diminuir quantidade">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-sm">{quantidade}</span>
              <button
                onClick={() => setQuantidade((q) => Math.min(restantes || q, q + 1))}
                disabled={!restantes || quantidade >= restantes}
                className="px-3 py-3 text-suave hover:text-tinta disabled:opacity-40"
                aria-label="Aumentar quantidade"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button onClick={adicionar} disabled={!podeAdicionar} className={cn(botaoLoja(), "flex-1")}>
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
            <FichaTecnica produto={produto} tamanho={tamanhoSelecionado || undefined} />
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
