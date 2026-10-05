import { useMemo } from "react";
import { Link } from "react-router-dom";
import { CartaoGrafico, GraficoBarras, GraficoLinhas, Variacao, horasFmt, pct } from "@/components/graficos";
import { Badge, Metrica } from "@/components/ui";
import {
  COR_MARCA,
  baldes,
  filtrarAtendimentos,
  resumoAtendimentos,
  serie,
  todosOsAtendimentos,
  variacao,
} from "@/lib/analise";
import { dataBR, lojas, nomeCliente, prioridadeChamado, tomPrioridade } from "@/lib/dados";
import { useEstado } from "@/lib/store";
import { BarraFiltros, Cabecalho, FiltroSelect, useFiltros } from "./comum";

const MOTIVOS = ["Dúvida", "Troca", "Entrega", "Defeito"];
const CANAIS = ["WhatsApp", "Portal", "E-mail", "Loja"];
const ordem = { Alta: 0, Média: 1, Baixa: 2 } as const;

/** Atendente: a fila de agora e como o atendimento está indo no período. */
export function DashboardAtendente() {
  const { chamados } = useEstado();
  const f = useFiltros();
  const todos = useMemo(() => todosOsAtendimentos(chamados), [chamados]);

  const recorte = (r: { inicio: string; fim: string }) => ({
    ...r,
    lojaIds: f.loja ? [f.loja] : [],
    canal: f.canal,
    motivo: f.motivo,
  });
  const atual = filtrarAtendimentos(todos, recorte(f.intervalo.atual));
  const ra = resumoAtendimentos(atual);
  const raAnt = resumoAtendimentos(filtrarAtendimentos(todos, recorte(f.intervalo.anterior)));

  // A fila é sempre "agora": só respeita loja, canal e motivo.
  const fila = chamados
    .filter((c) => c.status !== "Resolvido")
    .filter((c) => (!f.loja || c.lojaId === f.loja) && (!f.canal || c.canal === f.canal) && (!f.motivo || c.motivo === f.motivo));
  const semResposta = fila.filter((c) => c.status === "Aberto");
  const urgentes = fila.filter((c) => prioridadeChamado(c) === "Alta");

  const bs = baldes(f.periodo);
  const volume = serie(atual, bs, (xs) => xs.length);
  const porMotivo = MOTIVOS.map((m) => atual.filter((a) => a.motivo === m).length);
  const respostaCanal = CANAIS.map((c) => resumoAtendimentos(atual.filter((a) => a.canal === c)).respostaMedia ?? 0);

  return (
    <div>
      <Cabecalho descricao="Atendimento · todos os canais e todas as casas" />

      <BarraFiltros filtros={f}>
        <FiltroSelect
          rotulo="Loja"
          valor={f.loja}
          onChange={(v) => f.definir("loja", v)}
          opcoes={lojas.map((l) => ({ value: l.id, label: l.nome }))}
          todos="Todas"
        />
        <FiltroSelect rotulo="Canal" valor={f.canal} onChange={(v) => f.definir("canal", v)} opcoes={CANAIS} />
        <FiltroSelect rotulo="Motivo" valor={f.motivo} onChange={(v) => f.definir("motivo", v)} opcoes={MOTIVOS} />
      </BarraFiltros>

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Metrica rotulo="Sem resposta agora" valor={semResposta.length} nota={`${fila.length} em aberto · ${urgentes.length} urgentes`} to="/painel/atendimento" destaque={semResposta.length > 0} />
        <Metrica rotulo="Chamados recebidos" valor={ra.total} extra={<Variacao valor={variacao(ra.total, raAnt.total)} inverter />} />
        <Metrica
          rotulo="Primeira resposta (média)"
          valor={ra.respostaMedia === null ? "—" : horasFmt(ra.respostaMedia)}
          extra={<Variacao valor={ra.respostaMedia && raAnt.respostaMedia ? variacao(ra.respostaMedia, raAnt.respostaMedia) : null} inverter />}
        />
        <Metrica rotulo="Taxa de resolução" valor={pct(ra.taxaResolucao)} nota={`${ra.resolvidos} resolvidos no período`} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <CartaoGrafico
          titulo="Chamados recebidos ao longo do tempo"
          tabela={{ cabecalho: ["Período", "Chamados"], linhas: bs.map((b, i) => [b.rotulo, volume[i]!]) }}
        >
          <GraficoLinhas rotulos={bs.map((b) => b.rotulo)} series={[{ id: "v", nome: "Chamados", cor: COR_MARCA, valores: volume }]} formatar={(n) => String(Math.round(n))} />
        </CartaoGrafico>

        <section className="rounded-sm border border-linha bg-papel">
          <header className="flex items-start justify-between px-5 pt-4">
            <div>
              <h2 className="font-sans text-sm font-semibold">Próximos da fila</h2>
              <p className="mt-0.5 text-xs text-suave">Prioridade primeiro, depois os mais antigos</p>
            </div>
            <Link to="/painel/atendimento" className="text-xs font-semibold text-marinho">
              Ver fila
            </Link>
          </header>
          <ul className="divide-y divide-linha px-5 pb-2 pt-2">
            {[...fila]
              .sort((a, b) => ordem[prioridadeChamado(a)] - ordem[prioridadeChamado(b)] || a.abertoEm.localeCompare(b.abertoEm))
              .slice(0, 6)
              .map((c) => (
                <li key={c.id}>
                  <Link to={`/painel/atendimento/chamado/${c.id}`} className="flex items-center gap-3 py-3 text-sm hover:text-marinho">
                    <Badge tom={tomPrioridade[prioridadeChamado(c)]}>{prioridadeChamado(c)}</Badge>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{c.assunto}</span>
                      <span className="text-xs text-suave">
                        {nomeCliente(c.clienteId)} · {c.canal} · desde {dataBR(c.abertoEm)}
                      </span>
                    </span>
                    {c.status === "Aberto" ? <span className="text-[10px] font-bold uppercase tracking-wider text-perigo">Sem resposta</span> : null}
                  </Link>
                </li>
              ))}
            {fila.length === 0 ? <li className="py-6 text-center text-sm text-suave">Fila zerada.</li> : null}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CartaoGrafico
          titulo="Por motivo"
          subtitulo="Chamados recebidos no período"
          tabela={{ cabecalho: ["Motivo", "Chamados"], linhas: MOTIVOS.map((m, i) => [m, porMotivo[i]!]) }}
        >
          <GraficoBarras categorias={MOTIVOS} series={[{ id: "m", nome: "Chamados", cor: COR_MARCA, valores: porMotivo }]} formatar={String} />
        </CartaoGrafico>
        <CartaoGrafico
          titulo="Tempo até a primeira resposta, por canal"
          subtitulo="Média no período — quanto menor, melhor"
          tabela={{ cabecalho: ["Canal", "Primeira resposta"], linhas: CANAIS.map((c, i) => [c, respostaCanal[i] ? horasFmt(respostaCanal[i]!) : "—"]) }}
        >
          <GraficoBarras categorias={CANAIS} series={[{ id: "r", nome: "Primeira resposta", cor: COR_MARCA, valores: respostaCanal }]} formatar={(n) => (n ? horasFmt(n) : "—")} />
        </CartaoGrafico>
      </div>
    </div>
  );
}
