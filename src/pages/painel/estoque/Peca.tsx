import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { ModalAjuste, ModalMovimento, ModalTransferencia } from "@/components/estoque";
import {
  Badge,
  Botao,
  Card,
  CardTitulo,
  LinhaVazia,
  Tabela,
  Voltar,
  sinal,
  td,
  th,
} from "@/components/ui";
import { FotoProduto } from "@/components/vitrine";
import { dataBR, moeda, nomeLoja, statusProduto, tomEstoque, totalProduto } from "@/lib/dados";
import { equipe, useLojaEscopo, usePapel } from "@/lib/sessao";
import { useEstado } from "@/lib/store";

type ModalAberto = "movimento" | "ajuste" | "transferencia" | null;

export function Peca() {
  const { sku } = useParams();
  const { produtos } = useEstado();
  const papel = usePapel();
  const escopo = useLojaEscopo();
  const [modal, setModal] = useState<ModalAberto>(null);
  const produto = produtos.find((p) => p.sku === sku);
  if (!produto) return <Navigate to="/painel/estoque" replace />;

  const lojaIds = escopo ? [escopo] : undefined;
  const status = statusProduto(produto, lojaIds);
  // O operador acompanha só as movimentações que ele mesmo registrou.
  const historico = produto.movimentacoes.filter(
    (m) => (!escopo || m.lojaId === escopo) && (papel !== "operador_estoque" || m.responsavel === equipe.operador_estoque.nome),
  );
  const fechar = () => setModal(null);

  return (
    <div>
      <Voltar to="/painel/estoque">Saldo de estoque</Voltar>

      <div className="mb-8 flex flex-wrap items-start gap-6">
        <FotoProduto sku={produto.sku} alt={produto.nome} className="aspect-[4/5] w-24 shrink-0" />
        <div className="flex-1">
          <p className="font-mono text-xs text-suave">{produto.sku}</p>
          <h1 className="text-4xl font-light">{produto.nome}</h1>
          <p className="mt-1 text-sm text-suave">
            {produto.categoria} · {moeda(produto.preco)}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Badge tom={tomEstoque[status]}>{status}</Badge>
            <span className="text-sm">
              <strong className="font-display text-2xl text-marinho">{totalProduto(produto, lojaIds)}</strong>{" "}
              {escopo ? `unidades em ${nomeLoja(escopo)}` : "unidades na rede"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Botao variante="secundario" onClick={() => setModal("movimento")}>
            Entrada / saída
          </Botao>
          <Botao variante="secundario" onClick={() => setModal("ajuste")}>
            Ajuste de inventário
          </Botao>
          <Botao onClick={() => setModal("transferencia")}>Pedir transferência</Botao>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <Card className="h-fit">
          <CardTitulo titulo="Saldo por loja" />
          <ul className="divide-y divide-linha">
            {produto.saldos
              .filter((s) => !escopo || s.lojaId === escopo)
              .map((s) => {
                const pct = Math.min(100, (s.quantidade / Math.max(s.minimo * 3, 1)) * 100);
                const baixo = s.quantidade <= s.minimo;
                return (
                  <li key={s.lojaId} className="px-5 py-4">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium">{nomeLoja(s.lojaId)}</span>
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
            acao={papel === "operador_estoque" ? <span className="text-xs text-suave">Somente as que você registrou</span> : null}
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
              {historico.map((m) => (
                <tr key={m.id}>
                  <td className={td}>{dataBR(m.data)}</td>
                  <td className={td}>
                    {m.tipo}
                    {m.observacao ? <span className="block text-xs text-suave">{m.observacao}</span> : null}
                  </td>
                  <td className={`${td} tabular-nums ${m.quantidade < 0 ? "text-perigo" : "text-sucesso"}`}>
                    {sinal(m.quantidade)}
                  </td>
                  <td className={td}>{nomeLoja(m.lojaId)}</td>
                  <td className={`${td} text-suave`}>{m.responsavel}</td>
                </tr>
              ))}
              {historico.length === 0 ? <LinhaVazia colunas={5} texto="Nenhuma movimentação registrada." /> : null}
            </tbody>
          </Tabela>
        </Card>
      </div>

      {modal === "movimento" ? <ModalMovimento aberto skuFixo={produto.sku} onFechar={fechar} /> : null}
      {modal === "ajuste" ? <ModalAjuste aberto skuFixo={produto.sku} onFechar={fechar} /> : null}
      {modal === "transferencia" ? <ModalTransferencia aberto skuFixo={produto.sku} onFechar={fechar} /> : null}
    </div>
  );
}
