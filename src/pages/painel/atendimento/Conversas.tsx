import { useState } from "react";
import { Link } from "react-router-dom";
import { AvisoErro, Badge, Botao, Card, Contador, Metrica, Segmentado, Titulo, cn } from "@/components/ui";
import { useCaixaDeConversas } from "@/hooks/useChat";
import type { SecaoConversas } from "@/lib/chatApi";
import { dataHoraBRdoIso, tomPrioridade } from "@/lib/chamadosUi";

const POR_PAGINA = 20;

/**
 * Caixa de conversas ao vivo do atendimento. As seções separam o trabalho de cada atendente:
 * "Fila" (ninguém assumiu), "Minhas" (o que eu assumi) e "Todas" (a loja inteira). Chegou mensagem
 * nova, a caixa se atualiza sozinha (Supabase Realtime).
 */
export function Conversas() {
  const [secao, setSecao] = useState<SecaoConversas>("todas");
  const [apenasNaoLidas, setApenasNaoLidas] = useState(false);
  const [pagina, setPagina] = useState(0);

  const { lista, resumo } = useCaixaDeConversas({
    secao,
    apenasNaoLidas,
    limit: POR_PAGINA,
    offset: pagina * POR_PAGINA,
  });

  const r = resumo.dados;
  const itens = lista.dados?.itens ?? [];
  const total = lista.dados?.total ?? 0;
  const trocar = <T,>(definir: (v: T) => void) => (v: T) => {
    definir(v);
    setPagina(0);
  };

  return (
    <div>
      <Titulo titulo="Conversas" descricao="Mensagens dos clientes em tempo real, com o que ainda não foi lido." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metrica rotulo="Aguardando resposta" valor={r?.aguardando_resposta ?? "—"} nota="o cliente falou por último" destaque />
        <Metrica rotulo="Não lidas" valor={r?.nao_lidas ?? "—"} nota={r ? `em ${r.com_nao_lidas} conversas` : undefined} />
        <Metrica rotulo="Na fila" valor={r?.fila ?? "—"} nota="ninguém assumiu" />
        <Metrica rotulo="Minhas" valor={r?.minhas ?? "—"} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmentado
          valor={secao}
          onChange={trocar(setSecao)}
          opcoes={[
            { value: "fila", label: `Fila${r ? ` (${r.fila})` : ""}` },
            { value: "minhas", label: `Minhas${r ? ` (${r.minhas})` : ""}` },
            { value: "todas", label: "Todas" },
          ]}
        />
        <label className="flex items-center gap-2 text-sm text-suave">
          <input
            type="checkbox"
            checked={apenasNaoLidas}
            onChange={(e) => trocar(setApenasNaoLidas)(e.target.checked)}
          />
          Só não lidas
        </label>
      </div>

      <AvisoErro erro={lista.erro ?? resumo.erro} className="mb-4" />

      <Card>
        <ul aria-busy={lista.carregando} className={cn("divide-y divide-linha/70 transition-opacity", lista.carregando && "opacity-60")}>
          {itens.map((c) => (
            <li key={c.id_atendimento}>
              <Link
                to={`/painel/atendimento/chamado/${c.id_atendimento}`}
                className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-areia/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn("truncate", c.nao_lidas ? "font-semibold" : "font-medium")}>{c.cliente_nome}</p>
                    <Badge tom={tomPrioridade(c.prioridade.codigo)}>{c.prioridade.nome}</Badge>
                    {c.aguardando_resposta ? <Badge tom="alerta">Aguardando resposta</Badge> : null}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-suave">
                    {c.assunto} · <span className="font-mono">{c.protocolo}</span> · {c.sou_responsavel ? "com você" : (c.responsavel_nome ? `com ${c.responsavel_nome}` : "na fila")}
                  </p>
                  <p className={cn("mt-1.5 truncate text-sm", c.nao_lidas ? "text-tinta" : "text-suave")}>
                    {c.ultima_mensagem
                      ? `${c.ultima_mensagem.autor === "atendente" ? "Equipe: " : ""}${c.ultima_mensagem.texto}`
                      : "Sem mensagens ainda."}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5 text-xs text-suave">
                  {c.ultima_mensagem ? <span>{dataHoraBRdoIso(c.ultima_mensagem.enviada_em)}</span> : null}
                  <Contador valor={c.nao_lidas} />
                </div>
              </Link>
            </li>
          ))}
          {itens.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-suave">
              {lista.carregando ? "Carregando as conversas…" : "Nenhuma conversa aberta aqui."}
            </li>
          ) : null}
        </ul>

        {total > POR_PAGINA ? (
          <div className="flex items-center justify-between border-t border-linha px-5 py-3 text-sm text-suave">
            <span>
              {pagina * POR_PAGINA + 1}–{Math.min((pagina + 1) * POR_PAGINA, total)} de {total}
            </span>
            <div className="flex gap-2">
              <Botao variante="secundario" disabled={pagina === 0} onClick={() => setPagina(pagina - 1)}>
                Anterior
              </Botao>
              <Botao variante="secundario" disabled={(pagina + 1) * POR_PAGINA >= total} onClick={() => setPagina(pagina + 1)}>
                Próxima
              </Botao>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
