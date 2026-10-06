import { Link } from "react-router-dom";
import { FotoCampanha, Legenda, botaoLoja } from "@/components/vitrine";
import { CAMPANHA, CORES } from "@/lib/loja";
import { Passos } from "./Inicio";

const precos: [string, string, string][] = [
  ["Terno", "R$ 3.900", "Paletó e calça, três provas"],
  ["Paletó", "R$ 2.700", "Duas ou três provas"],
  ["Camisa", "R$ 690", "Mínimo de duas, uma prova"],
  ["Calça", "R$ 1.300", "Duas provas"],
];

const tecidos = [
  { nome: "Lã fria", origem: "Biella, Itália", cor: CORES.noitePaulistana },
  { nome: "Flanela", origem: "Yorkshire, Inglaterra", cor: CORES.cafe },
  { nome: "Linho", origem: "Irlanda", cor: CORES.areiaIpanema },
  { nome: "Algodão egípcio", origem: "Americana, SP", cor: CORES.ceuMinas },
];

export function SobMedida() {
  return (
    <div>
      <div className="relative h-[70vh] min-h-[480px] px-2.5">
        <FotoCampanha id={CAMPANHA.sobMedida} largura={1800} className="absolute inset-x-2.5 inset-y-0" />
        <div className="absolute bottom-7 left-7 right-7 z-[2] max-w-[520px] bg-creme p-7 md:left-10">
          <small className="text-xs tracking-wide text-suave">Sob medida</small>
          <h1 className="mt-1 text-[40px] leading-[1.05] md:text-[52px]">Do primeiro risco de giz à terceira prova.</h1>
        </div>
      </div>

      <section className="mx-auto grid max-w-[1360px] gap-14 px-5 pt-24 md:grid-cols-[1fr_1fr] md:px-12">
        <div>
          <p className="font-display text-[23px] leading-normal">
            Sob medida, na Casa Lorenzi, quer dizer uma roupa cortada a partir do seu corpo — não de uma tabela. São trinta e uma medidas, três encontros e um alfaiate que vai lembrar do seu ombro na próxima vez.
          </p>
          <Passos />
          <Link to="/agendar?tipo=sob-medida" className={botaoLoja()}>
            Marcar a primeira conversa
          </Link>
        </div>
        <div>
          <FotoCampanha id={CAMPANHA.amostras} largura={1000} className="aspect-[4/5]" />
          <Legenda destaque="Mais de duzentos cortes por estação.">Você escolhe o tecido na mão, com luz do dia.</Legenda>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1360px] gap-14 px-5 pt-28 md:grid-cols-2 md:px-12">
        <div>
          <h2 className="mb-6 text-[40px]">Quanto custa</h2>
          {precos.map(([peca, preco, nota]) => (
            <div key={peca} className="alinhavo grid grid-cols-[1fr_auto] items-baseline py-4">
              <span>
                <span className="font-display text-[22px]">{peca}</span>
                <span className="block text-sm text-suave">{nota}</span>
              </span>
              <span className="font-display text-[22px]">a partir de {preco}</span>
            </div>
          ))}
          <p className="mt-4 text-sm text-suave">Ajustes para sempre, sem custo. Prazo médio de cinco semanas.</p>
        </div>
        <div>
          <h2 className="mb-6 text-[40px]">Alguns tecidos da estação</h2>
          <div className="grid grid-cols-2 gap-4">
            {tecidos.map((t) => (
              <div key={t.nome} className="costurado bg-pergaminho p-5 text-tinta">
                <span className="mb-4 block h-16 w-full" style={{ background: t.cor.hex }} />
                <p className="font-display text-xl">{t.nome}</p>
                <p className="text-sm text-suave">
                  {t.origem} · {t.cor.nome}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
