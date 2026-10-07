import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AvisoErro,
  Badge,
  Botao,
  Campo,
  Card,
  Filtros,
  LinhaVazia,
  Metrica,
  Segmentado,
  Select,
  Tabela,
  Titulo,
  cn,
  linhaClicavel,
  td,
  th,
} from "@/components/ui";
import { useListaChamados, useOpcoesChamados, useResumoChamados } from "@/hooks/useChamados";
import type { PrioridadeFiltro, Responsavel, Situacao } from "@/lib/chamadosApi";
import {
  PRIORIDADES_FILTRO,
  SITUACOES,
  chamadoFinalizado,
  dataBRdoIso,
  prioridadeUrgente,
  tomPrioridade,
  tomStatus,
} from "@/lib/chamadosUi";

const POR_PAGINA = 20;
const comTodos = (lista: { value: string; label: string }[], todos = "Todos") => [{ value: "", label: todos }, ...lista];

/**
 * Fila de chamados do atendimento. As três seções separam o trabalho de cada atendente:
 * "Fila" (ninguém assumiu), "Meus chamados" (o que eu assumi) e "Todos" (a loja inteira).
 */
export function Chamados() {
  const navigate = useNavigate();
  const [secao, setSecao] = useState<Responsavel>("todos");
  const [situacao, setSituacao] = useState<Situacao>("abertos");
  const [loja, setLoja] = useState("");
  const [prioridade, setPrioridade] = useState("");
  const [canal, setCanal] = useState("");
  const [categoria, setCategoria] = useState("");
  const [pagina, setPagina] = useState(0);

  const idLoja = loja || undefined;
  const opcoes = useOpcoesChamados();
  const resumo = useResumoChamados(idLoja);
  const lista = useListaChamados({
    situacao,
    responsavel: secao,
    prioridade: (prioridade || undefined) as PrioridadeFiltro | undefined,
    canal: canal || undefined,
    categoria: categoria || undefined,
    idLoja,
    limit: POR_PAGINA,
    offset: pagina * POR_PAGINA,
  });

  // Mudar qualquer filtro volta para a primeira página.
  const filtrar = <T,>(definir: (v: T) => void) => (v: T) => {
    definir(v);
    setPagina(0);
  };

  const r = resumo.dados;
  const itens = lista.dados?.itens ?? [];
  const total = lista.dados?.total ?? 0;
  const lojas = opcoes.dados?.lojas ?? [];
  const erro = lista.erro ?? resumo.erro ?? opcoes.erro;

  return (
    <div>
      <Titulo titulo="Chamados" descricao="Fila unificada de todos os canais, ordenada por prioridade." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metrica rotulo="Sem resposta" valor={r?.sem_resposta ?? "—"} nota="aguardando o primeiro retorno" destaque />
        <Metrica rotulo="Em andamento" valor={r?.em_andamento ?? "—"} />
        <Metrica rotulo="Prioridade alta" valor={r?.prioridade_alta ?? "—"} nota="abertos com urgência" />
        <Metrica rotulo="Resolvidos" valor={r?.resolvidos ?? "—"} nota="no histórico" />
      </div>

      <div className="mb-4">
        <Segmentado
          valor={secao}
          onChange={filtrar(setSecao)}
          opcoes={[
            { value: "fila", label: `Fila${r ? ` (${r.na_fila})` : ""}` },
            { value: "eu", label: `Meus chamados${r ? ` (${r.meus})` : ""}` },
            { value: "todos", label: "Todos" },
          ]}
        />
      </div>

      <Filtros>
        <Campo label="Situação" className="flex-1">
          <Select value={situacao} onChange={(e) => filtrar(setSituacao)(e.target.value as Situacao)} opcoes={SITUACOES} />
        </Campo>
        {lojas.length > 1 ? (
          <Campo label="Loja" className="flex-1">
            <Select
              value={loja}
              onChange={(e) => filtrar(setLoja)(e.target.value)}
              opcoes={comTodos(lojas.map((l) => ({ value: l.id_loja, label: l.nome })), "Todas")}
            />
          </Campo>
        ) : null}
        <Campo label="Prioridade" className="flex-1">
          <Select value={prioridade} onChange={(e) => filtrar(setPrioridade)(e.target.value)} opcoes={comTodos(PRIORIDADES_FILTRO, "Todas")} />
        </Campo>
        <Campo label="Canal" className="flex-1">
          <Select
            value={canal}
            onChange={(e) => filtrar(setCanal)(e.target.value)}
            opcoes={comTodos((opcoes.dados?.canais ?? []).map((c) => ({ value: c.codigo, label: c.nome })))}
          />
        </Campo>
        <Campo label="Motivo" className="flex-1">
          <Select
            value={categoria}
            onChange={(e) => filtrar(setCategoria)(e.target.value)}
            opcoes={comTodos((opcoes.dados?.categorias ?? []).map((c) => ({ value: c.codigo, label: c.nome })))}
          />
        </Campo>
      </Filtros>

      <AvisoErro erro={erro} className="mb-4" />

      <Card>
        <div aria-busy={lista.carregando} className={cn("transition-opacity", lista.carregando && "opacity-60")}>
          <Tabela>
            <thead>
              <tr>
                <th className={th}>Prioridade</th>
                <th className={th}>Cliente / assunto</th>
                <th className={th}>Motivo</th>
                <th className={th}>Canal</th>
                <th className={th}>Loja</th>
                <th className={th}>Com</th>
                <th className={th}>Abertura</th>
                <th className={th}>Situação</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((c) => (
                <tr
                  key={c.id_atendimento}
                  onClick={() => navigate(`/painel/atendimento/chamado/${c.id_atendimento}`)}
                  className={cn(
                    linhaClicavel,
                    prioridadeUrgente(c.prioridade.codigo) && !chamadoFinalizado(c.status.codigo) && "shadow-[inset_3px_0_0] shadow-perigo",
                  )}
                >
                  <td className={td}>
                    <Badge tom={tomPrioridade(c.prioridade.codigo)}>{c.prioridade.nome}</Badge>
                  </td>
                  <td className={td}>
                    <p className="font-medium">{c.cliente_nome}</p>
                    <p className="text-xs text-suave">
                      {c.assunto} · <span className="font-mono">{c.protocolo}</span>
                    </p>
                  </td>
                  <td className={td}>{c.categoria.nome}</td>
                  <td className={td}>{c.canal.nome}</td>
                  <td className={td}>{c.loja_nome ?? "Sem loja"}</td>
                  <td className={td}>{c.sou_responsavel ? "Você" : (c.responsavel_nome ?? "Na fila")}</td>
                  <td className={td}>{dataBRdoIso(c.aberto_em)}</td>
                  <td className={td}>
                    <Badge tom={tomStatus(c.status.codigo)}>{c.status.nome}</Badge>
                  </td>
                </tr>
              ))}
              {itens.length === 0 ? (
                <LinhaVazia
                  colunas={8}
                  texto={lista.carregando ? "Carregando os chamados…" : "Nenhum chamado com esses filtros."}
                />
              ) : null}
            </tbody>
          </Tabela>
        </div>

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
