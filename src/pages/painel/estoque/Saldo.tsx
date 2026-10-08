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
  Select,
  Tabela,
  Titulo,
  cn,
  inputClasses,
  linhaClicavel,
  td,
  th,
} from "@/components/ui";
import { FotoProduto } from "@/components/vitrine";
import { useAtraso, useOpcoesEstoque, useSaldoEstoque } from "@/hooks/useEstoquePainel";
import { moedaBR } from "@/lib/chamadosUi";
import {
  ROTULO_SITUACAO,
  TOM_SITUACAO,
  destaqueDaQuantidade,
  detalheDaPeca,
  faixaDaPagina,
} from "@/lib/estoquePainelUi";

const POR_PAGINA = 50;

/** Saldo de estoque da loja (ou da rede) vindo da API: nada aqui é calculado a partir de dados de exemplo. */
export function Saldo() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [situacao, setSituacao] = useState("");
  const [loja, setLoja] = useState("");
  const [pagina, setPagina] = useState(0);
  const buscaAtrasada = useAtraso(busca.trim());

  const opcoes = useOpcoesEstoque();
  const podeEscolherLoja = opcoes.dados?.escopo.pode_escolher_loja === true;
  const consulta = useSaldoEstoque({
    idLoja: podeEscolherLoja ? loja || undefined : undefined,
    busca: buscaAtrasada || undefined,
    categoria: categoria || undefined,
    situacao: situacao || undefined,
    limit: POR_PAGINA,
    offset: pagina * POR_PAGINA,
  });

  const saldo = consulta.dados;
  const lojas = saldo?.lojas ?? [];
  const porUnidade = lojas.length > 1;
  const resumo = saldo?.resumo;
  const itens = saldo?.itens ?? [];
  const total = saldo?.total ?? 0;
  const erro = consulta.erro ?? opcoes.erro;

  // Qualquer filtro novo volta para a primeira página.
  const filtrar = <T,>(definir: (v: T) => void) => (v: T) => {
    definir(v);
    setPagina(0);
  };

  return (
    <div>
      <Titulo
        titulo="Saldo de estoque"
        descricao={
          porUnidade
            ? "Saldo por unidade da rede. Clique numa peça para ver o detalhe e o histórico."
            : `Peças disponíveis em ${lojas[0]?.nome ?? "sua unidade"}. Clique numa peça para ver o detalhe e o histórico.`
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metrica rotulo="Unidades em estoque" valor={resumo?.unidades ?? "—"} nota={resumo ? `${resumo.produtos} ${resumo.produtos === 1 ? "peça" : "peças"} · ${resumo.pecas} SKUs` : undefined} />
        <Metrica rotulo="SKUs com estoque baixo" valor={resumo?.estoque_baixo ?? "—"} nota="no mínimo ou abaixo" />
        <Metrica
          rotulo="SKUs esgotados"
          valor={resumo?.esgotadas ?? "—"}
          nota="sem nenhuma unidade"
          destaque={(resumo?.esgotadas ?? 0) > 0}
        />
        <Metrica rotulo="Valor em estoque" valor={resumo ? moedaBR(resumo.valor_em_estoque) : "—"} nota="a preço de venda" />
      </div>

      <Filtros>
        {podeEscolherLoja ? (
          <Campo className="flex-1" label="Unidade">
            <Select
              value={loja}
              onChange={(e) => filtrar(setLoja)(e.target.value)}
              opcoes={[{ value: "", label: "Todas" }, ...(opcoes.dados?.lojas ?? []).map((l) => ({ value: l.id_loja, label: l.nome }))]}
            />
          </Campo>
        ) : null}
        <Campo className="flex-1" label="Buscar">
          <input
            value={busca}
            onChange={(e) => filtrar(setBusca)(e.target.value)}
            maxLength={80}
            placeholder="Nome ou SKU"
            className={inputClasses}
          />
        </Campo>
        <Campo className="flex-1" label="Categoria">
          <Select
            value={categoria}
            onChange={(e) => filtrar(setCategoria)(e.target.value)}
            opcoes={[{ value: "", label: "Todas" }, ...(opcoes.dados?.categorias ?? []).map((c) => ({ value: c, label: c }))]}
          />
        </Campo>
        <Campo className="flex-1" label="Situação">
          <Select
            value={situacao}
            onChange={(e) => filtrar(setSituacao)(e.target.value)}
            opcoes={[{ value: "", label: "Todas" }, ...(opcoes.dados?.situacoes ?? []).map((s) => ({ value: s.codigo, label: s.nome }))]}
          />
        </Campo>
      </Filtros>

      <AvisoErro erro={erro} className="mb-4" />

      <Card>
        <div aria-busy={consulta.carregando} className={cn("transition-opacity", consulta.carregando && "opacity-60")}>
          <Tabela>
            <thead>
              <tr>
                <th className={th}>Peça</th>
                <th className={th}>Categoria</th>
                <th className={th}>Preço</th>
                {porUnidade ? lojas.map((l) => <th key={l.id_loja} className={cn(th, "text-right")}>{l.nome}</th>) : null}
                <th className={cn(th, "text-right")}>{porUnidade ? "Total" : "Saldo"}</th>
                <th className={th}>Situação</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((p) => (
                <tr
                  key={p.id_variacao}
                  onClick={() => navigate(`/painel/estoque/peca/${encodeURIComponent(p.sku)}`)}
                  className={linhaClicavel}
                >
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      <FotoProduto sku={p.sku} alt="" className="h-10 w-8 shrink-0" />
                      <div>
                        <p className="font-medium">
                          {p.produto} <span className="font-normal text-suave">· {detalheDaPeca(p)}</span>
                        </p>
                        <p className="font-mono text-[11px] text-suave">{p.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className={td}>{p.categoria ?? "—"}</td>
                  <td className={td}>{moedaBR(p.preco)}</td>
                  {porUnidade
                    ? lojas.map((l) => {
                        const s = p.por_loja.find((x) => x.id_loja === l.id_loja);
                        const destaque = s ? destaqueDaQuantidade(s.quantidade, s.minimo) : null;
                        return (
                          <td
                            key={l.id_loja}
                            className={cn(
                              td,
                              "text-right tabular-nums",
                              destaque === "alerta" && "font-semibold text-alerta",
                              destaque === "perigo" && "font-semibold text-perigo",
                            )}
                          >
                            {s ? s.quantidade : "—"}
                          </td>
                        );
                      })
                    : null}
                  <td className={cn(td, "text-right font-semibold tabular-nums")}>{p.total}</td>
                  <td className={td}>
                    <Badge tom={TOM_SITUACAO[p.situacao]}>{ROTULO_SITUACAO[p.situacao]}</Badge>
                  </td>
                </tr>
              ))}
              {itens.length === 0 ? (
                <LinhaVazia
                  colunas={5 + (porUnidade ? lojas.length : 0)}
                  texto={consulta.carregando ? "Carregando o estoque…" : "Nenhuma peça com esses filtros."}
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
