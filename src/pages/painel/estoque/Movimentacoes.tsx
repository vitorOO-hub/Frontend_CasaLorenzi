import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AvisoErro,
  Botao,
  Campo,
  Card,
  Filtros,
  LinhaVazia,
  Select,
  Tabela,
  Titulo,
  cn,
  inputClasses,
  sinal,
  td,
  th,
} from "@/components/ui";
import { useMovimentacoesEstoque, useOpcoesEstoque } from "@/hooks/useEstoquePainel";
import { dataHoraBRdoIso } from "@/lib/chamadosUi";
import {
  detalheDaPeca,
  faixaDaPagina,
  observacaoDaMovimentacao,
  responsavelDaMovimentacao,
} from "@/lib/estoquePainelUi";

const POR_PAGINA = 25;
const AVISO_REGISTRO = "O registro de entradas, saídas e ajustes ainda não está ligado ao servidor.";

/** Histórico de movimentações de estoque, direto do banco (cada linha é um lançamento real). */
export function Movimentacoes() {
  const [params, setParams] = useSearchParams();
  const sku = params.get("sku") ?? "";
  const [tipo, setTipo] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [loja, setLoja] = useState("");
  const [pagina, setPagina] = useState(0);

  const opcoes = useOpcoesEstoque();
  const escopo = opcoes.dados?.escopo;
  const consulta = useMovimentacoesEstoque({
    tipo: tipo || undefined,
    sku: sku || undefined,
    de: de || undefined,
    ate: ate || undefined,
    idLoja: escopo?.pode_escolher_loja ? loja || undefined : undefined,
    limit: POR_PAGINA,
    offset: pagina * POR_PAGINA,
  });

  const itens = consulta.dados?.itens ?? [];
  const total = consulta.dados?.total ?? 0;
  const mostrarLoja = escopo?.pode_escolher_loja === true && !loja;
  const erro = consulta.erro ?? opcoes.erro;

  const filtrar = <T,>(definir: (v: T) => void) => (v: T) => {
    definir(v);
    setPagina(0);
  };
  const escolherPeca = (valor: string) => {
    const novo = new URLSearchParams(params);
    if (valor) novo.set("sku", valor);
    else novo.delete("sku");
    setParams(novo, { replace: true });
    setPagina(0);
  };

  const descricao = escopo?.somente_minhas
    ? `Entradas, saídas e ajustes que você registrou em ${escopo.loja_nome ?? "sua unidade"}.`
    : escopo?.id_loja
      ? `Histórico completo de ${escopo.loja_nome ?? "sua unidade"}, de todos os operadores.`
      : "Histórico completo da rede.";

  return (
    <div>
      <Titulo
        titulo="Movimentações"
        descricao={descricao}
        acao={
          <>
            <Botao variante="secundario" disabled title={AVISO_REGISTRO}>
              Ajuste de inventário
            </Botao>
            <Botao disabled title={AVISO_REGISTRO}>
              Registrar entrada / saída
            </Botao>
          </>
        }
      />

      <Filtros>
        <Campo label="Tipo" className="flex-1">
          <Select
            value={tipo}
            onChange={(e) => filtrar(setTipo)(e.target.value)}
            opcoes={[{ value: "", label: "Todos" }, ...(opcoes.dados?.tipos ?? []).map((t) => ({ value: t.codigo, label: t.nome }))]}
          />
        </Campo>
        <Campo label="Peça" className="flex-[2]">
          <Select
            value={sku}
            onChange={(e) => escolherPeca(e.target.value)}
            opcoes={[{ value: "", label: "Todas" }, ...(opcoes.dados?.pecas ?? []).map((p) => ({ value: p.sku, label: `${p.nome} (${p.sku})` }))]}
          />
        </Campo>
        {escopo?.pode_escolher_loja ? (
          <Campo label="Loja" className="flex-1">
            <Select
              value={loja}
              onChange={(e) => filtrar(setLoja)(e.target.value)}
              opcoes={[{ value: "", label: "Todas" }, ...(opcoes.dados?.lojas ?? []).map((l) => ({ value: l.id_loja, label: l.nome }))]}
            />
          </Campo>
        ) : null}
        <Campo label="De" className="flex-1">
          <input type="date" value={de} onChange={(e) => filtrar(setDe)(e.target.value)} className={inputClasses} />
        </Campo>
        <Campo label="Até" className="flex-1">
          <input type="date" value={ate} onChange={(e) => filtrar(setAte)(e.target.value)} className={inputClasses} />
        </Campo>
      </Filtros>

      <AvisoErro erro={erro} className="mb-4" />

      <Card>
        <div aria-busy={consulta.carregando} className={cn("transition-opacity", consulta.carregando && "opacity-60")}>
          <Tabela>
            <thead>
              <tr>
                <th className={th}>Data</th>
                <th className={th}>Peça</th>
                <th className={th}>Tipo</th>
                <th className={cn(th, "text-right")}>Qtd.</th>
                <th className={cn(th, "text-right")}>Saldo</th>
                {mostrarLoja ? <th className={th}>Loja</th> : null}
                <th className={th}>Responsável</th>
                <th className={th}>Observação</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((m) => (
                <tr key={m.id_movimentacao}>
                  <td className={cn(td, "whitespace-nowrap")}>{dataHoraBRdoIso(m.data)}</td>
                  <td className={td}>
                    <p className="font-medium">{m.produto}</p>
                    <p className="text-[11px] text-suave">
                      {detalheDaPeca(m)} · <span className="font-mono">{m.sku}</span>
                    </p>
                  </td>
                  <td className={td}>{m.tipo_nome}</td>
                  <td className={cn(td, "text-right tabular-nums", m.quantidade < 0 ? "text-perigo" : "text-sucesso")}>
                    {sinal(m.quantidade)}
                  </td>
                  <td className={cn(td, "text-right tabular-nums text-suave")}>
                    {m.quantidade_anterior} → {m.quantidade_posterior}
                  </td>
                  {mostrarLoja ? <td className={td}>{m.loja_nome}</td> : null}
                  <td className={cn(td, "text-suave")}>{responsavelDaMovimentacao(m)}</td>
                  <td className={cn(td, "text-suave")}>{observacaoDaMovimentacao(m)}</td>
                </tr>
              ))}
              {itens.length === 0 ? (
                <LinhaVazia
                  colunas={mostrarLoja ? 8 : 7}
                  texto={consulta.carregando ? "Carregando as movimentações…" : "Nenhuma movimentação com esses filtros."}
                />
              ) : null}
            </tbody>
          </Tabela>
        </div>

        {total > POR_PAGINA ? (
          <div className="flex items-center justify-between border-t border-linha px-5 py-3 text-sm text-suave">
            <span>{faixaDaPagina(pagina, POR_PAGINA, total)}</span>
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
