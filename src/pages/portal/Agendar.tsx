import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { cn } from "@/components/ui";
import { FotoCampanha, botaoLoja } from "@/components/vitrine";
import { clientes, lojas, nomeLoja } from "@/lib/dados";
import { casas } from "@/lib/loja";
import { useSessao } from "@/lib/sessao";
import { abrirChamado, useEstado } from "@/lib/store";
import { CampoLoja, campoLoja } from "./Checkout";

const TIPOS = [
  { id: "ajuste", rotulo: "Ajustar uma peça", nota: "Barra, mangas, cintura — 20 min" },
  { id: "prova", rotulo: "Provar a pronta-entrega", nota: "Separamos as peças no seu tamanho" },
  { id: "sob-medida", rotulo: "Conversa de sob medida", nota: "Escolha de tecido e medidas — 40 min" },
] as const;

const HORARIOS = ["10:00", "11:30", "14:00", "15:30", "17:00", "18:30"];
const DIAS_SEMANA = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];

/** Próximos seis dias úteis de prova (a casa fecha aos domingos). */
function proximosDias() {
  const dias: { iso: string; rotulo: string }[] = [];
  const d = new Date();
  while (dias.length < 6) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0) continue;
    dias.push({
      iso: d.toISOString().slice(0, 10),
      rotulo: `${DIAS_SEMANA[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
    });
  }
  return dias;
}

function Escolha({ ativa, onClick, children, className }: { ativa: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border-[1.5px] px-4 py-3 text-left transition-colors",
        ativa ? "border-dashed border-tinta bg-pergaminho" : "border-linha hover:border-tinta/50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Agendar() {
  const [params] = useSearchParams();
  const sessao = useSessao();
  const { produtos } = useEstado();
  const peca = produtos.find((p) => p.sku === params.get("peca"));
  const cliente = sessao?.tipo === "cliente" ? clientes.find((c) => c.id === sessao.clienteId) : undefined;
  const dias = proximosDias();

  const tipoInicial = params.get("tipo") === "sob-medida" ? "sob-medida" : peca ? "prova" : "ajuste";
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]["id"]>(tipoInicial);
  const [lojaId, setLojaId] = useState("l1");
  const [dia, setDia] = useState(dias[0]!.iso);
  const [hora, setHora] = useState("14:00");
  const [nome, setNome] = useState(cliente?.nome ?? "");
  const [telefone, setTelefone] = useState(cliente?.telefone ?? "");
  const [obs, setObs] = useState(peca ? `Quero provar a peça ${peca.nome}.` : "");
  const [feito, setFeito] = useState(false);

  const rotuloDia = dias.find((d) => d.iso === dia)?.rotulo ?? dia;
  const tipoRotulo = TIPOS.find((t) => t.id === tipo)!.rotulo;

  if (feito) {
    const info = casas[lojaId];
    return (
      <div className="mx-auto grid max-w-[1180px] gap-12 px-5 pt-12 md:grid-cols-2 md:px-12">
        {info ? <FotoCampanha id={info.foto} largura={1000} className="aspect-[4/3]" /> : null}
        <div>
          <p className="text-[15px] text-caramelo">Prova marcada</p>
          <h1 className="mt-2 text-[48px] leading-tight">
            {rotuloDia}, às {hora}.
          </h1>
          <p className="mt-4 font-display text-xl">
            {tipoRotulo} na casa {nomeLoja(lojaId)}. {info ? `Quem recebe você é ${info.alfaiate.split(",")[0]}.` : ""}
          </p>
          <p className="mt-6 font-mao text-2xl leading-tight text-caramelo">
            Anotado na agenda da casa. Se precisar mudar, é só responder a mensagem de confirmação. — {info?.autor ?? "a casa"}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            {cliente ? (
              <Link to="/conta/atendimento" className={botaoLoja()}>
                Ver nas minhas conversas
              </Link>
            ) : null}
            <Link to="/loja" className={botaoLoja(cliente ? "contorno" : "tabaco")}>
              Voltar para a loja
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1180px] px-5 pt-10 md:px-12">
      <h1 className="text-[56px] leading-none md:text-[64px]">Agendar uma prova</h1>
      <p className="mt-4 max-w-xl font-display text-xl text-suave">Café passado, a peça separada no seu tamanho e um alfaiate com tempo. Sem custo.</p>

      <form
        className="mt-10 space-y-10"
        onSubmit={(e) => {
          e.preventDefault();
          // Cliente logado: a prova entra como conversa e aparece para o time no painel interno.
          if (cliente) {
            abrirChamado({
              clienteId: cliente.id,
              nomeCliente: cliente.nome,
              assunto: `Prova agendada — ${rotuloDia}, ${hora}`,
              motivo: "Dúvida",
              lojaId,
              sku: peca?.sku,
              descricao: `${tipoRotulo} na casa ${nomeLoja(lojaId)}, ${rotuloDia} às ${hora}.${obs ? ` Observação: ${obs}` : ""}`,
            });
          }
          setFeito(true);
          window.scrollTo(0, 0);
        }}
      >
        <section>
          <h2 className="mb-4 text-[28px]">O que vamos fazer</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {TIPOS.map((t) => (
              <Escolha key={t.id} ativa={tipo === t.id} onClick={() => setTipo(t.id)}>
                <span className="block font-display text-xl">{t.rotulo}</span>
                <span className="text-sm text-suave">{t.nota}</span>
              </Escolha>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-[28px]">Em qual casa</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {lojas.map((l) => (
              <Escolha key={l.id} ativa={lojaId === l.id} onClick={() => setLojaId(l.id)}>
                <span className="block font-display text-xl">{l.nome}</span>
                <span className="text-sm text-suave">{casas[l.id]?.alfaiate ?? l.cidade}</span>
              </Escolha>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-[28px]">Quando</h2>
          <div className="flex flex-wrap gap-2">
            {dias.map((d) => (
              <Escolha key={d.iso} ativa={dia === d.iso} onClick={() => setDia(d.iso)} className="min-w-28 text-center">
                {d.rotulo}
              </Escolha>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {HORARIOS.map((h) => (
              <Escolha key={h} ativa={hora === h} onClick={() => setHora(h)} className="min-w-20 text-center">
                {h}
              </Escolha>
            ))}
          </div>
        </section>

        <section className="grid max-w-3xl gap-4 sm:grid-cols-2">
          <h2 className="text-[28px] sm:col-span-2">Seu contato</h2>
          <CampoLoja rotulo="Nome">
            <input required value={nome} onChange={(e) => setNome(e.target.value)} className={campoLoja} />
          </CampoLoja>
          <CampoLoja rotulo="WhatsApp">
            <input required value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 90000-0000" className={campoLoja} />
          </CampoLoja>
          <CampoLoja rotulo="Alguma observação?" className="sm:col-span-2">
            <textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: casamento em dezembro, prefiro tons escuros" className={campoLoja} />
          </CampoLoja>
        </section>

        <button type="submit" className={botaoLoja()}>
          Marcar {rotuloDia}, {hora}
        </button>
      </form>
    </div>
  );
}
