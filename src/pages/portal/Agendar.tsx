import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { usandoApi } from "@/api/config";
import { mensagemDeErro } from "@/api/erros";
import { cn } from "@/components/ui";
import { FotoCampanha, botaoLoja } from "@/components/vitrine";
import { clientes, lojas, nomeLoja } from "@/lib/dados";
import { casas } from "@/lib/loja";
import { useSessao } from "@/lib/sessao";
import * as acoes from "@/lib/acoes";
import { criarAgendamentoCliente, listarOpcoesAgendamentoCliente, type SlotAgendamentoClienteApi } from "@/lib/agendamentosClienteApi";
import { useProdutosCatalogo } from "@/lib/catalogoApi";
import { listarLojasCliente, type LojaClienteApi } from "@/lib/comprasClienteApi";
import { useEstado } from "@/lib/store";
import { useAcao } from "@/lib/useAcao";
import { CampoLoja, campoLoja } from "./Checkout";

const TIPOS = [
  { id: "ajuste", rotulo: "Ajustar uma peça", nota: "Barra, mangas, cintura — 20 min" },
  { id: "prova", rotulo: "Provar a pronta-entrega", nota: "Separamos as peças no seu tamanho" },
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

function rotuloData(iso: string) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const data = new Date(ano!, mes! - 1, dia!);
  return `${DIAS_SEMANA[data.getDay()]} ${String(data.getDate()).padStart(2, "0")}/${String(data.getMonth() + 1).padStart(2, "0")}`;
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
  const modoApi = usandoApi();
  const estado = useEstado();
  const { produtos } = useProdutosCatalogo(estado.produtos);
  const peca = produtos.find((p) => p.sku === params.get("peca"));
  const cliente = sessao?.tipo === "cliente" ? clientes.find((c) => c.id === sessao.clienteId) : undefined;
  const diasSimulados = proximosDias();

  const tipoInicial = peca ? "prova" : "ajuste";
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]["id"]>(tipoInicial);
  const [lojaId, setLojaId] = useState("l1");
  const [dia, setDia] = useState(diasSimulados[0]!.iso);
  const [hora, setHora] = useState("14:00");
  const [nome, setNome] = useState(cliente?.nome ?? "");
  const [telefone, setTelefone] = useState(cliente?.telefone ?? "");
  const [obs, setObs] = useState(peca ? `Quero provar a peça ${peca.nome}.` : "");
  const [feito, setFeito] = useState<{ id?: string; protocolo?: string } | null>(null);
  const [lojasApi, setLojasApi] = useState<LojaClienteApi[]>([]);
  const [slotsApi, setSlotsApi] = useState<SlotAgendamentoClienteApi[]>([]);
  const [erroApi, setErroApi] = useState<string | null>(null);
  const { executar, ocupado, erro } = useAcao();

  const lojasParaEscolher = lojasApi.length
    ? lojasApi.map((l) => ({ id: l.id_loja, nome: l.nome, nota: [l.cidade, l.uf].filter(Boolean).join(", ") || l.endereco || "Casa ativa" }))
    : lojas.map((l) => ({ id: l.id, nome: l.nome, nota: casas[l.id]?.alfaiate ?? l.cidade }));
  const slotsDaLoja = slotsApi.filter((slot) => slot.id_loja === lojaId);
  const diasApi = Array.from(new Set(slotsDaLoja.map((slot) => slot.data))).map((iso) => ({ iso, rotulo: rotuloData(iso) }));
  const dias = modoApi && diasApi.length ? diasApi : diasSimulados;
  const horarios = modoApi ? slotsDaLoja.filter((slot) => slot.data === dia).map((slot) => slot.horario) : HORARIOS;
  const rotuloDia = dias.find((d) => d.iso === dia)?.rotulo ?? dia;
  const tipoRotulo = TIPOS.find((t) => t.id === tipo)!.rotulo;

  useEffect(() => {
    if (!modoApi || sessao?.tipo !== "cliente") return;
    let ativo = true;
    Promise.all([listarLojasCliente(), listarOpcoesAgendamentoCliente()])
      .then(([lista, opcoes]) => {
        if (!ativo) return;
        setLojasApi(lista);
        if (lista[0]) setLojaId(lista[0].id_loja);
        setSlotsApi(opcoes.slots);
        setErroApi(null);
      })
      .catch((erro) => {
        if (ativo) setErroApi(mensagemDeErro(erro));
      });
    return () => {
      ativo = false;
    };
  }, [modoApi, sessao?.tipo]);

  useEffect(() => {
    if (!modoApi || !slotsApi.length) return;
    const slots = slotsApi.filter((slot) => slot.id_loja === lojaId);
    if (!slots.some((slot) => slot.data === dia)) {
      const primeiro = slots[0];
      if (primeiro) {
        setDia(primeiro.data);
        setHora(primeiro.horario);
      }
      return;
    }
    const horariosDoDia = slots.filter((slot) => slot.data === dia).map((slot) => slot.horario);
    if (horariosDoDia.length && !horariosDoDia.includes(hora)) setHora(horariosDoDia[0]!);
  }, [dia, hora, lojaId, modoApi, slotsApi]);

  if (feito) {
    const info = casas[lojaId];
    const conversa = feito.id ? `/conta/atendimento/${feito.id}` : "/conta/atendimento";
    return (
      <div className="mx-auto grid max-w-[1180px] gap-12 px-5 pt-12 md:grid-cols-2 md:px-12">
        {info ? <FotoCampanha id={info.foto} largura={1000} className="aspect-[4/3]" /> : null}
        <div>
          <p className="text-[15px] text-caramelo">{feito.protocolo ? `Protocolo ${feito.protocolo}` : "Prova marcada"}</p>
          <h1 className="mt-2 text-[48px] leading-tight">
            {rotuloDia}, às {hora}.
          </h1>
          <p className="mt-4 font-display text-xl">{tipoRotulo} na casa {lojasParaEscolher.find((l) => l.id === lojaId)?.nome ?? nomeLoja(lojaId)}.</p>
          <p className="mt-6 font-mao text-[14px] leading-relaxed text-caramelo">
            A casa recebeu a sua solicitação. Se precisar mudar, continue pela conversa criada no atendimento.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            {sessao?.tipo === "cliente" ? (
              <Link to={conversa} className={botaoLoja()}>
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
          void executar("agendar", async () => {
            if (modoApi) {
              if (sessao?.tipo !== "cliente") throw new Error("Entre na sua conta para agendar uma prova.");
              const novo = await criarAgendamentoCliente({
                tipo,
                id_loja: lojaId,
                data: dia,
                horario: hora,
                nome,
                telefone,
                observacao: obs || null,
                peca_sku: peca?.sku ?? null,
                peca_nome: peca?.nome ?? null,
              });
              setFeito({ id: novo.id_atendimento, protocolo: novo.protocolo });
            } else if (cliente) {
              const novo = await acoes.abrirChamado({
                assunto: `Prova agendada — ${rotuloDia}, ${hora}`,
                motivo: "Dúvida",
                lojaId,
                sku: peca?.sku,
                descricao: `${tipoRotulo} na casa ${nomeLoja(lojaId)}, ${rotuloDia} às ${hora}.${obs ? ` Observação: ${obs}` : ""}`,
              });
              setFeito({ id: novo.id, protocolo: novo.protocolo });
            } else {
              setFeito({});
            }
            window.scrollTo(0, 0);
          });
        }}
      >
        <section>
          <h2 className="mb-4 text-[28px]">O que vamos fazer</h2>
          <div className="grid gap-3 md:grid-cols-2">
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
            {lojasParaEscolher.map((l) => (
              <Escolha key={l.id} ativa={lojaId === l.id} onClick={() => setLojaId(l.id)}>
                <span className="block font-display text-xl">{l.nome}</span>
                <span className="text-sm text-suave">{l.nota}</span>
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
            {horarios.map((h) => (
              <Escolha key={h} ativa={hora === h} onClick={() => setHora(h)} className="min-w-20 text-center">
                {h}
              </Escolha>
            ))}
          </div>
          {modoApi && !horarios.length ? <p className="mt-3 text-sm text-perigo">Não há horários livres nesta casa para os próximos dias.</p> : null}
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

        {erroApi ? <p role="alert" className="text-sm text-perigo">{erroApi}</p> : null}
        {erro ? <p role="alert" className="text-sm text-perigo">{erro}</p> : null}
        <button type="submit" disabled={ocupado !== null} className={botaoLoja()}>
          {ocupado ? "Marcando…" : `Marcar ${rotuloDia}, ${hora}`}
        </button>
      </form>
    </div>
  );
}
