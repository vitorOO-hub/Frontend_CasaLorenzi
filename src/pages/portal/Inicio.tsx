import { Link } from "react-router-dom";
import { CabecalhoSecao, CartaoProduto, FotoCampanha, FichaTecnica, Legenda, botaoLoja } from "@/components/vitrine";
import { CasaCartao } from "./Casas";
import { lojas } from "@/lib/dados";
import { CAMPANHA, EDICAO, materias, retratos } from "@/lib/loja";
import { useEstado } from "@/lib/store";
import { CartaoMateria } from "./Caderno";

const ARARA = ["CL-0509", "CL-0204", "CL-0407", "CL-0203", "CL-0101"];

export function Inicio() {
  const { produtos } = useEstado();
  const arara = ARARA.map((s) => produtos.find((p) => p.sku === s)).filter((p) => p !== undefined);
  const blazer = produtos.find((p) => p.sku === "CL-0204");

  return (
    <div>
      {/* Dois mundos: pronta-entrega e sob medida */}
      <div className="grid gap-2.5 px-2.5 md:h-[86vh] md:min-h-[620px] md:grid-cols-2">
        {[
          { foto: CAMPANHA.prontaEntrega, rotulo: "Pronta-entrega", frase: "A coleção, com a barra feita enquanto você espera.", acao: `Ver a Edição ${EDICAO.numero}`, to: "/loja", pos: "center 35%" },
          { foto: CAMPANHA.sobMedida, rotulo: "Sob medida", frase: "Do primeiro risco de giz à terceira prova.", acao: "Como funciona", to: "/sob-medida", pos: "center" },
        ].map((m) => (
          <Link key={m.to} to={m.to} className="group relative block h-[72vh] md:h-auto">
            <FotoCampanha id={m.foto} largura={1600} posicao={m.pos} className="absolute inset-0" />
            <div className="absolute bottom-6 left-6 right-6 z-[2] max-w-[420px] bg-creme px-6 pb-5 pt-5 md:bottom-7 md:left-7">
              <small className="text-xs tracking-wide text-suave">{m.rotulo}</small>
              <b className="mt-1 block font-display text-[28px] font-normal leading-tight md:text-[32px]">{m.frase}</b>
              <span className="link-tracejado mt-3 inline-block text-sm group-hover:text-caramelo">{m.acao}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Edição atual */}
      <section className="mx-auto grid max-w-[1360px] items-start gap-12 px-5 pt-28 md:grid-cols-[7fr_4fr] md:gap-[72px] md:px-12">
        <div>
          <FotoCampanha id={CAMPANHA.edicaoGrande} largura={1400} className="aspect-[4/5]" />
          <Legenda destaque="Helena veste o Trench Milano em Areia de Ipanema.">Fotografada numa terça de garoa, na Rua Oscar Freire.</Legenda>
        </div>
        <div className="md:pt-10">
          <p className="text-[15px] text-caramelo">Edição {EDICAO.numero}</p>
          <h1 className="mb-7 mt-2.5 text-[56px] leading-[0.95] md:text-[76px]">
            {EDICAO.nome}
            <i className="text-caramelo">.</i>
          </h1>
          <p className="font-display text-[21px] leading-normal">{EDICAO.texto}</p>
          <p className="mt-4 text-[15px] text-suave">Dezoito peças, produzidas em séries de no máximo quarenta. Quando acabam, não voltam.</p>
          <div className="ml-auto mt-11 w-[72%]">
            <FotoCampanha id={CAMPANHA.edicaoDetalhe} largura={700} className="aspect-square" />
            <Legenda>De perto: gabardine de algodão com cinto forrado.</Legenda>
          </div>
        </div>
      </section>

      {/* Arara da semana: grade irregular */}
      <section className="mx-auto max-w-[1360px] px-5 pt-32 md:px-12">
        <CabecalhoSecao titulo="Na arara desta semana" acao="Todas as peças" para="/loja" />
        <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
          {arara.map((p, i) => (
            <CartaoProduto
              key={p.sku}
              produto={p}
              grande={i === 0}
              legenda={i === 0 ? "Corte reto, ombro natural e cinto forrado. Ajustamos a barra e as mangas na hora, em qualquer casa." : undefined}
            />
          ))}
        </div>
      </section>

      {/* Por dentro de uma peça */}
      <div className="mt-32 bg-marinho text-[#efe6d6]">
        <div className="mx-auto grid max-w-[1360px] items-center gap-16 px-5 py-24 md:grid-cols-2 md:gap-20 md:px-12">
          <div>
            <h2 className="mb-5 text-[44px] leading-none text-[#efe6d6] md:text-[54px]">
              Por dentro de
              <br />
              <i className="text-ouro-claro">um blazer Lorenzi.</i>
            </h2>
            <p className="max-w-md text-[#efe6d6]/80">
              Toda peça sai daqui com uma etiqueta costurada no forro. Ela diz de onde veio o tecido, onde foi costurada e quem fez o seu ajuste. É a nossa assinatura — e a sua garantia.
            </p>
            <div className="mt-9 grid grid-cols-3 gap-4">
              {[
                [CAMPANHA.prova1, "1ª prova", "O giz marca ombro, cava e cintura."],
                [CAMPANHA.prova2, "2ª prova", "A peça ainda alinhavada, para ajustar o caimento."],
                [CAMPANHA.prova3, "3ª prova", "Acabamento à mão e a etiqueta assinada."],
              ].map(([id, titulo, texto]) => (
                <div key={titulo}>
                  <FotoCampanha id={id!} largura={500} className="aspect-[4/5]" />
                  <p className="mt-2.5 text-[13px] text-[#efe6d6]/75">
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

      {/* Sob medida */}
      <section className="mx-auto max-w-[1360px] px-5 pt-32 md:px-12">
        <div className="grid bg-pergaminho md:grid-cols-[5fr_6fr]">
          <FotoCampanha id={CAMPANHA.amostras} largura={1000} className="min-h-[360px] md:min-h-[560px]" />
          <div className="p-8 md:p-16">
            <h2 className="mb-4 text-[40px] leading-tight md:text-[52px]">Uma roupa feita no seu corpo, em três provas.</h2>
            <p className="text-suave">Você escolhe o tecido entre mais de duzentos cortes que chegam a cada estação. A gente tira trinta e uma medidas e marca três encontros.</p>
            <Passos />
            <Link to="/agendar?tipo=sob-medida" className={botaoLoja()}>
              Marcar a primeira conversa
            </Link>
            <p className="mt-3.5 text-[13px] text-suave">A partir de R$ 3.900 o terno. Nas três casas.</p>
          </div>
        </div>
      </section>

      {/* Caderno do Ateliê */}
      <section className="mx-auto max-w-[1360px] px-5 pt-32 md:px-12">
        <CabecalhoSecao titulo="Caderno do Ateliê" acao="Ler todas as notas" para="/caderno" />
        <div className="grid gap-7 md:grid-cols-[1.3fr_1fr_1fr]">
          {materias.map((m, i) => (
            <CartaoMateria key={m.slug} materia={m} destaque={i === 0} />
          ))}
        </div>
      </section>

      {/* Quem veste */}
      <section className="mx-auto max-w-[1360px] px-5 pt-32 md:px-12">
        <CabecalhoSecao titulo="Quem veste Lorenzi" />
        <div className="grid grid-cols-2 items-end gap-4 md:grid-cols-[1fr_1.2fr_1fr_1.2fr]">
          {retratos.map((r, i) => (
            <div key={r.nome}>
              <FotoCampanha id={r.foto} largura={600} className={i % 2 ? "aspect-[3/4.4]" : "aspect-[3/4]"} />
              <Legenda destaque={r.nome}>{r.texto}</Legenda>
            </div>
          ))}
        </div>
      </section>

      {/* As casas */}
      <section className="mx-auto max-w-[1360px] px-5 pt-32 md:px-12">
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

export function Passos() {
  return (
    <div className="my-7">
      {[
        "Conversa e escolha do tecido — 40 minutos, com café.",
        "Primeira e segunda prova, três semanas depois.",
        "Prova final e entrega. Ajustes para sempre, sem custo.",
      ].map((t, i) => (
        <div key={t} className="alinhavo grid grid-cols-[40px_1fr] py-3.5 text-[15px]">
          <span className="font-display text-[22px] text-caramelo">{i + 1}</span>
          {t}
        </div>
      ))}
    </div>
  );
}
