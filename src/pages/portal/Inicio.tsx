import { ArrowRight, RefreshCw, Scissors, Store, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { CartaoProduto, FotoProduto, TituloVitrine } from "@/components/vitrine";
import { lojas } from "@/lib/dados";
import { useEstado } from "@/lib/store";

const categorias = [
  { nome: "Alfaiataria", sku: "CL-0204", texto: "Blazers e calças de corte preciso" },
  { nome: "Camisaria", sku: "CL-0101", texto: "Linho, oxford e algodão egípcio" },
  { nome: "Malharia", sku: "CL-0407", texto: "Tricots e lã merino" },
  { nome: "Acessórios", sku: "CL-0712", texto: "Couro curtido à mão" },
];

const servicos = [
  { icone: Scissors, titulo: "Ajustes sem custo", texto: "Barra, manga e cintura feitos no nosso ateliê." },
  { icone: Store, titulo: "Retire na loja", texto: "Compre online e retire em uma das três casas." },
  { icone: Truck, titulo: "Frete grátis", texto: "Para compras acima de R$ 1.000 em todo o Brasil." },
  { icone: RefreshCw, titulo: "Troca em 30 dias", texto: "Primeira troca gratuita, online ou na loja." },
];

export function Inicio() {
  const { produtos } = useEstado();
  const destaques = produtos.filter((p) => p.saldos.some((s) => s.quantidade > 0)).slice(0, 8);

  return (
    <div>
      {/* Hero editorial */}
      <section className="relative flex min-h-[78vh] items-center overflow-hidden">
        <img
          src="/img/hero.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-marinho-escuro/90 via-marinho-escuro/60 to-marinho-escuro/10" />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-24 md:px-8">
          <div className="max-w-xl text-white">
            <p className="rotulo !text-dourado">Coleção permanente · Outono 2026</p>
            <h1 className="mt-5 text-5xl font-light leading-[1.05] md:text-7xl">
              O bom corte
              <br />
              <em className="font-normal">não tem estação.</em>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-white/75">
              Alfaiataria, camisaria e malharia em pequenas séries, com acabamento artesanal e
              ajustes feitos no nosso ateliê.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                to="/loja"
                className="bg-papel px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-marinho transition-colors hover:bg-dourado hover:text-white"
              >
                Explorar a coleção
              </Link>
              <Link
                to="/loja?categoria=Alfaiataria"
                className="border border-white/50 px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-white hover:bg-white/10"
              >
                Alfaiataria
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categorias */}
      <section className="mx-auto max-w-7xl px-4 pt-24 md:px-8">
        <TituloVitrine sobre="Compre por categoria" titulo="Da arara do ateliê" centro />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {categorias.map((c) => (
            <Link key={c.nome} to={`/loja?categoria=${c.nome}`} className="group relative block">
              <FotoProduto
                sku={c.sku}
                alt={c.nome}
                className="aspect-[3/4] [&_img]:transition-transform [&_img]:duration-700 group-hover:[&_img]:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-marinho-escuro/80 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <h3 className="text-2xl md:text-3xl">{c.nome}</h3>
                <p className="mt-1 hidden text-xs text-white/70 sm:block">{c.texto}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Destaques */}
      <section className="mx-auto max-w-7xl px-4 pt-24 md:px-8">
        <TituloVitrine
          sobre="Seleção da casa"
          titulo="Peças em destaque"
          acao={
            <Link
              to="/loja"
              className="flex items-center gap-2 border-b border-marinho pb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-marinho hover:border-dourado hover:text-dourado"
            >
              Ver coleção completa <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
          {destaques.map((p) => (
            <CartaoProduto key={p.sku} produto={p} />
          ))}
        </div>
      </section>

      {/* Editorial do ateliê */}
      <section className="mx-auto mt-24 max-w-7xl px-4 md:px-8">
        <div className="grid items-center gap-0 bg-papel md:grid-cols-2">
          <FotoProduto sku="CL-0509" alt="Trench Coat Milano" className="aspect-[4/5] md:aspect-auto md:h-full" />
          <div className="px-8 py-14 md:px-16">
            <span className="filete" />
            <p className="rotulo mt-6 !text-dourado">O ateliê</p>
            <h2 className="mt-3 text-4xl font-light leading-tight md:text-5xl">
              Feito para durar, ajustado para você.
            </h2>
            <p className="mt-6 text-sm leading-relaxed text-suave">
              Cada peça passa pelas mãos dos nossos alfaiates antes de chegar até você. Nas três
              casas, a prova e os ajustes de barra, manga e cintura são cortesia — porque uma boa
              roupa precisa vestir bem desde o primeiro dia.
            </p>
            <Link
              to="/conta/atendimento/novo"
              className="mt-8 inline-flex items-center gap-2 bg-marinho px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white hover:bg-marinho-escuro"
            >
              Agendar uma prova <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Serviços */}
      <section className="mx-auto max-w-7xl px-4 pt-24 md:px-8">
        <div className="grid gap-px overflow-hidden border border-linha bg-linha sm:grid-cols-2 lg:grid-cols-4">
          {servicos.map((s) => (
            <div key={s.titulo} className="bg-creme p-8 text-center">
              <s.icone className="mx-auto h-6 w-6 text-dourado" strokeWidth={1.25} />
              <h3 className="mt-4 text-xl">{s.titulo}</h3>
              <p className="mt-2 text-sm text-suave">{s.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Lojas */}
      <section className="mx-auto max-w-7xl px-4 pt-24 md:px-8">
        <TituloVitrine sobre="Visite-nos" titulo="Nossas casas" centro />
        <div className="grid gap-6 md:grid-cols-3">
          {lojas.map((l) => (
            <div key={l.id} className="border-t border-dourado/60 pt-6 text-center">
              <h3 className="text-2xl">{l.nome}</h3>
              <p className="mt-2 text-sm text-suave">{l.endereco}</p>
              <p className="text-sm text-suave">{l.cidade}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.16em] text-tinta/70">
                Seg. a sáb. 10h–22h · Dom. 14h–20h
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
