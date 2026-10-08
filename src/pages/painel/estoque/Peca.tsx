import { useState } from "react";
import { useParams } from "react-router-dom";
import { ModalAjusteEstoque, ModalMovimentoEstoque } from "@/components/estoqueRegistro";
import { ModalTransferenciaEstoque } from "@/components/estoqueTransferencia";
import { AvisoErro, Badge, Botao, Card, CardTitulo, LinhaVazia, Tabela, Voltar, cn, sinal, td, th } from "@/components/ui";
import { FotoProduto } from "@/components/vitrine";
import { useMovimentacoesEstoque, useOpcoesEstoque, useSaldoEstoque } from "@/hooks/useEstoquePainel";
import { dataHoraBRdoIso, moedaBR } from "@/lib/chamadosUi";
import {
  ROTULO_SITUACAO,
  TOM_SITUACAO,
  detalheDaPeca,
  observacaoDaMovimentacao,
  responsavelDaMovimentacao,
} from "@/lib/estoquePainelUi";

type ModalAberto = "movimento" | "ajuste" | "transferencia" | null;

/** Detalhe de uma peça: saldo por loja e histórico, tudo lido do servidor (escopo de loja incluso). */
export function Peca() {
  const { sku = "" } = useParams();
  const [modal, setModal] = useState<ModalAberto>(null);
  const opcoes = useOpcoesEstoque();
  const saldo = useSaldoEstoque({ busca: sku, limit: 20, offset: 0 });
  const historico = useMovimentacoesEstoque({ sku, limit: 25, offset: 0 });
  const escopo = opcoes.dados?.escopo;
  const peca = saldo.dados?.itens.find((i) => i.sku === sku);
  const lojas = saldo.dados?.lojas ?? [];
  const erro = saldo.erro ?? historico.erro ?? opcoes.erro;
  const recarregar = () => {
    saldo.recarregar();
    historico.recarregar();
  };

  if (!peca) {
    return (
      <div>
        <Voltar to="/painel/estoque">Saldo de estoque</Voltar>
        <AvisoErro erro={erro} className="mt-6" />
        <p className="py-16 text-center text-sm text-suave">
          {saldo.carregando && !saldo.dados ? "Carregando a peça…" : erro ? "" : "Peça não encontrada no estoque desta unidade."}
        </p>
      </div>
    );
  }

  const porUnidade = lojas.length > 1;

  return (
    <div>
      <Voltar to="/painel/estoque">Saldo de estoque</Voltar>

      <div className="mb-8 flex flex-wrap items-start gap-6">
        <FotoProduto sku={peca.sku} alt={peca.produto} className="aspect-[4/5] w-24 shrink-0" />
        <div className="flex-1">
          <p className="font-mono text-xs text-suave">{peca.sku}</p>
          <h1 className="text-4xl font-light">{peca.produto}</h1>
          <p className="mt-1 text-sm text-suave">
            {detalheDaPeca(peca)} · {peca.categoria ?? "Sem categoria"} · {moedaBR(peca.preco)}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Badge tom={TOM_SITUACAO[peca.situacao]}>{ROTULO_SITUACAO[peca.situacao]}</Badge>
            <span className="text-sm">
              <strong className="font-display text-2xl text-marinho">{peca.total}</strong>{" "}
              {porUnidade ? "unidades na rede" : `unidades em ${lojas[0]?.nome ?? "sua unidade"}`}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Botao variante="secundario" disabled={!opcoes.dados} onClick={() => setModal("movimento")}>
            Entrada / saída
          </Botao>
          {escopo?.papel !== "gerente" ? (
            <Botao variante="secundario" disabled={!opcoes.dados} onClick={() => setModal("ajuste")}>
              Ajuste de inventário
            </Botao>
          ) : null}
          {escopo && !escopo.pode_escolher_loja ? (
            <Botao disabled={!opcoes.dados} onClick={() => setModal("transferencia")}>
              Pedir transferência
            </Botao>
          ) : null}
        </div>
      </div>

      <AvisoErro erro={erro} className="mb-6" />

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <Card className="h-fit">
          <CardTitulo titulo="Saldo por loja" />
          <ul className="divide-y divide-linha">
            {peca.por_loja.map((s) => {
              const pct = Math.min(100, (s.quantidade / Math.max(s.minimo * 3, 1)) * 100);
              const baixo = s.quantidade <= s.minimo;
              return (
                <li key={s.id_loja} className="px-5 py-4">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium">{lojas.find((l) => l.id_loja === s.id_loja)?.nome ?? "Loja"}</span>
                    <span className="tabular-nums">
                      <strong>{s.quantidade}</strong> <span className="text-xs text-suave">/ mín. {s.minimo}</span>
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-areia">
                    <div
                      className={baixo ? "h-full bg-alerta" : "h-full bg-marinho"}
                      style={{ width: `${s.quantidade === 0 ? 0 : Math.max(pct, 4)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <CardTitulo
            titulo="Histórico de movimentações"
            acao={escopo?.somente_minhas ? <span className="text-xs text-suave">Somente as que você registrou</span> : null}
          />
          <Tabela>
            <thead>
              <tr>
                <th className={th}>Data</th>
                <th className={th}>Tipo</th>
                <th className={th}>Qtd.</th>
                <th className={th}>Loja</th>
                <th className={th}>Responsável</th>
              </tr>
            </thead>
            <tbody>
              {(historico.dados?.itens ?? []).map((m) => (
                <tr key={m.id_movimentacao}>
                  <td className={cn(td, "whitespace-nowrap")}>{dataHoraBRdoIso(m.data)}</td>
                  <td className={td}>
                    {m.tipo_nome}
                    <span className="block text-xs text-suave">{observacaoDaMovimentacao(m)}</span>
                  </td>
                  <td className={cn(td, "tabular-nums", m.quantidade < 0 ? "text-perigo" : "text-sucesso")}>{sinal(m.quantidade)}</td>
                  <td className={td}>{m.loja_nome}</td>
                  <td className={cn(td, "text-suave")}>{responsavelDaMovimentacao(m)}</td>
                </tr>
              ))}
              {(historico.dados?.itens.length ?? 0) === 0 ? (
                <LinhaVazia colunas={5} texto={historico.carregando ? "Carregando o histórico…" : "Nenhuma movimentação registrada."} />
              ) : null}
            </tbody>
          </Tabela>
        </Card>
      </div>

      {modal === "movimento" && opcoes.dados ? (
        <ModalMovimentoEstoque aberto opcoes={opcoes.dados} skuInicial={peca.sku} onFechar={() => setModal(null)} onSucesso={recarregar} />
      ) : null}
      {modal === "ajuste" && opcoes.dados ? (
        <ModalAjusteEstoque aberto opcoes={opcoes.dados} skuInicial={peca.sku} onFechar={() => setModal(null)} onSucesso={recarregar} />
      ) : null}
      {modal === "transferencia" && opcoes.dados ? (
        <ModalTransferenciaEstoque aberto opcoes={opcoes.dados} skuInicial={peca.sku} onFechar={() => setModal(null)} onSucesso={recarregar} />
      ) : null}
    </div>
  );
}
