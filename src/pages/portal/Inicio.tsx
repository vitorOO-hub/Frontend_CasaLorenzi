import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { CarrosselCampanha, filme, foto } from "@/components/campanha";
import { CabecalhoSecao, CartaoProduto, FotoCampanha, FichaTecnica } from "@/components/vitrine";
import { useProdutosCatalogo } from "@/lib/catalogoApi";
import { lojas, type Produto } from "@/lib/dados";
import { CAMPANHA, EDICAO, materias } from "@/lib/loja";
import { useEstado } from "@/lib/store";
import { CartaoMateria } from "./Caderno";
import { CasaCartao } from "./Casas";


/** Fileira de peças com rolagem lateral e setas, como uma arara. */
function FileiraProdutos({ titulo, produtos, para }: { titulo: string; produtos: Produto[]; para: string }) {
  const trilho = useRef<HTMLDivElement>(null);
  const rolar = (direcao: number) => trilho.current?.scrollBy({ left: direcao * trilho.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <section className="mx-auto max-w-[1440px] px-5 py-24 md:px-12">
      <div className="mb-8 flex items-baseline justify-between gap-4">
        <h2 className="text-[40px] leading-tight">{titulo}</h2>
        <div className="flex items-center gap-5">
          <Link to={para} className="link-tracejado text-sm">
            Ver todas
          </Link>
          <button onClick={() => rolar(-1)} aria-label="Anteriores" className="hidden hover:text-caramelo md:block">
            <ChevronLeft className="h-5 w-5" strokeWidth={1.4} />
          </button>
          <button onClick={() => rolar(1)} aria-label="Próximas" className="hidden hover:text-caramelo md:block">
            <ChevronRight className="h-5 w-5" strokeWidth={1.4} />
          </button>
        </div>
      </div>
      <div ref={trilho} className="-mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 [scrollbar-width:none] md:-mx-0 md:px-0">
        {produtos.map((p) => (
          <div key={p.sku} className="w-[72vw] shrink-0 snap-start sm:w-[42vw] lg:w-[23%]">
            <CartaoProduto produto={p} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function Inicio() {
  const estado = useEstado();
  const { produtos, carregando, erro } = useProdutosCatalogo(estado.produtos);
  const produtosDisponiveis = carregando || erro ? [] : produtos;
  // Só peças que existem no banco: nada de SKU fixo no código.
  const novidades = produtosDisponiveis.slice(0, 8);
  const blazer = produtosDisponiveis.find((p) => /blazer/i.test(p.nome));
  const trench = produtosDisponiveis.find((p) => /trench/i.test(p.nome));

  return (
    <div>
      {/* Abertura: três slides que mudam sozinhos */}
      <CarrosselCampanha
        slides={[
          { midia: filme(41491), sobre: `Edição ${EDICAO.numero}`, titulo: `${EDICAO.nome}.`, acao: "Ver a coleção", to: "/loja" },
          { midia: foto(CAMPANHA.prontaEntrega, "center 35%"), sobre: "Outerwear", titulo: "O casaco camelo volta à cidade", acao: "Ver casacos", to: "/loja?categoria=Outerwear" },
          { midia: foto(CAMPANHA.edicaoGrande), sobre: "Trench Milano", titulo: "Areia de Ipanema", acao: "Ver a peça", to: trench ? `/loja/${trench.sku}` : "/loja?categoria=Outerwear" },
        ]}
      />

      {carregando || erro ? (
        <section className="mx-auto max-w-[1440px] px-5 py-24 text-sm text-suave md:px-12">{carregando ? "Carregando peças..." : erro}</section>
      ) : (
        <FileiraProdutos titulo={`Novidades da Edição ${EDICAO.numero}`} produtos={novidades} para="/loja" />
      )}

      {/* Por dentro de uma peça */}
      <div className="bg-marinho text-creme">
        <div className="mx-auto grid max-w-[1360px] grid-cols-[minmax(0,1fr)] items-center gap-16 px-5 py-24 md:grid-cols-2 md:gap-20 md:px-12">
          <div>
            <h2 className="mb-5 text-[44px] leading-none text-creme md:text-[54px]">
              Por dentro de
              <br />
              <i className="text-ouro-claro">um blazer Lorenzi.</i>
            </h2>
            <p className="max-w-md text-creme/80">
              Toda peça sai daqui com uma etiqueta costurada no forro. Ela diz de onde veio o tecido, onde foi costurada e quem fez o seu ajuste.
            </p>
            <div className="mt-9 grid grid-cols-3 gap-4">
              {[
                [CAMPANHA.prova1, "Corte", "O giz risca o molde direto sobre a lã."],
                [CAMPANHA.prova2, "Alinhavo", "As partes alinhavadas, para acertar o caimento."],
                [CAMPANHA.prova3, "Acabamento", "Casas de botão à mão e a etiqueta assinada."],
              ].map(([id, titulo, texto]) => (
                <div key={titulo}>
                  <FotoCampanha id={id!} largura={500} className="aspect-[4/5]" />
                  <p className="mt-2.5 text-[13px] text-creme/75">
                    <b className="block font-display text-lg font-normal text-white">{titulo}</b>
                    {texto}
                  </p>
                </div>
              ))}
            </div>
          </div>
          {blazer ? (
            <div className="mx-auto w-full max-w-[470px]">
              <FichaTecnica produto={blazer} tamanho="40" />
            </div>
          ) : null}
        </div>
      </div>

      {/* Caderno do Ateliê */}
      <section className="mx-auto max-w-[1360px] px-5 pt-28 md:px-12">
        <CabecalhoSecao titulo="Caderno do Ateliê" acao="Ler todas as notas" para="/caderno" />
        <div className="grid gap-7 md:grid-cols-[1.3fr_1fr_1fr]">
          {materias.map((m, i) => (
            <CartaoMateria key={m.slug} materia={m} destaque={i === 0} />
          ))}
        </div>
      </section>

      {/* As casas */}
      <section className="mx-auto max-w-[1360px] px-5 pt-28 md:px-12">
        <CabecalhoSecao titulo="As três casas" acao="Endereços e horários" para="/casas" />
        <div className="grid gap-7 md:grid-cols-3">
          {lojas.slice(0, 3).map((l) => (
            <CasaCartao key={l.id} loja={l} />
          ))}
        </div>
      </section>
    </div>
  );
}
