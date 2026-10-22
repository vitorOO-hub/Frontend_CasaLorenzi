import { useState } from "react";
import { AvisoErro, Badge, Botao, Campo, Card, Filtros, LinhaVazia, Modal, Tabela, Titulo, cn, inputClasses, linhaClicavel, td, th, type Tom } from "@/components/ui";
import { Paginacao } from "@/components/Paginacao";
import { useAtraso } from "@/hooks/useClientes";
import { useDetalheVenda, useListaVendas } from "@/hooks/useVendas";
import { dataHoraBRdoIso, moedaBR } from "@/lib/chamadosUi";
import { rotuloDaPeca, POR_PAGINA_VENDAS } from "@/lib/vendasUi";
import type { DetalheVenda } from "@/lib/vendasApi";
import { NovaVenda } from "./NovaVenda";

const tomDoStatus = (codigo: string): Tom => (codigo === "cancelado" ? "perigo" : codigo === "entregue" || codigo === "pago" ? "ok" : "neutro");
const rotuloDoCanal = (canal: string) => (canal === "loja" ? "Loja" : "Online");

/**
 * Vendas do vendedor: todas as vendas registradas (loja e online) e o lançamento de venda nova
 * para um cliente já cadastrado, achado pelo CPF.
 */
export function Vendas() {
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(0);
  const [nova, setNova] = useState(false);
  const [aberta, setAberta] = useState<string | null>(null);
  const [lancada, setLancada] = useState<string | null>(null);
  const [recarregar, setRecarregar] = useState(0);

  const termo = useAtraso(busca);
  const lista = useListaVendas({ busca: termo, limit: POR_PAGINA_VENDAS, offset: pagina * POR_PAGINA_VENDAS }, recarregar);
  const itens = lista.dados?.itens ?? [];
  const total = lista.dados?.total ?? 0;

  return (
    <div>
      <Titulo
        titulo="Vendas"
        descricao="Todas as vendas registradas. Lance uma venda nova buscando o cliente pelo CPF."
        acao={<Botao onClick={() => { setLancada(null); setNova(true); }}>Nova venda</Botao>}
      />

      {lancada ? (
        <p role="status" className="mb-4 rounded-sm border border-linha bg-areia/40 px-4 py-3 text-sm">
          Venda <strong>{lancada}</strong> lançada. O estoque da loja já foi atualizado.
        </p>
      ) : null}

      <Filtros>
        <Campo label="Buscar" className="flex-1">
          <input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(0);
            }}
            maxLength={80}
            placeholder="Número da venda, nome ou CPF do cliente"
            className={inputClasses}
          />
        </Campo>
      </Filtros>

      <AvisoErro erro={lista.erro} className="mb-4" />

      <Card>
        <div aria-busy={lista.carregando} className={cn("transition-opacity", lista.carregando && "opacity-60")}>
          <Tabela>
            <thead>
              <tr>
                <th className={th}>Venda</th>
                <th className={th}>Cliente</th>
                <th className={th}>Loja</th>
                <th className={th}>Vendedor</th>
                <th className={th}>Peças</th>
                <th className={th}>Total</th>
                <th className={th}>Situação</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((v) => (
                <tr key={v.id_pedido} onClick={() => setAberta(v.id_pedido)} className={linhaClicavel}>
                  <td className={td}>
                    <p className="font-medium">{v.numero_pedido}</p>
                    <p className="text-xs text-suave">
                      {dataHoraBRdoIso(v.criado_em)} · {rotuloDoCanal(v.canal_venda)}
                    </p>
                  </td>
                  <td className={td}>{v.cliente}</td>
                  <td className={td}>{v.loja}</td>
                  <td className={td}>{v.vendedor ?? "—"}</td>
                  <td className={`${td} tabular-nums`}>{v.pecas}</td>
                  <td className={`${td} tabular-nums`}>{moedaBR(v.valor_total)}</td>
                  <td className={td}>
                    <Badge tom={tomDoStatus(v.status_codigo)}>{v.status}</Badge>
                  </td>
                </tr>
              ))}
              {itens.length === 0 ? (
                <LinhaVazia colunas={7} texto={lista.carregando ? "Carregando as vendas…" : "Nenhuma venda encontrada."} />
              ) : null}
            </tbody>
          </Tabela>
        </div>
        <Paginacao pagina={pagina} total={total} porPagina={POR_PAGINA_VENDAS} onMudar={setPagina} />
      </Card>

      <DetalheDaVenda id={aberta} onFechar={() => setAberta(null)} />
      <NovaVenda
        aberto={nova}
        onFechar={() => setNova(false)}
        aoLancar={(v) => {
          setNova(false);
          setLancada(v.numero_pedido);
          setPagina(0);
          setRecarregar((n) => n + 1);
        }}
      />
    </div>
  );
}

function DetalheDaVenda({ id, onFechar }: { id: string | null; onFechar: () => void }) {
  const detalhe = useDetalheVenda(id);
  const v: DetalheVenda | null = id ? detalhe.dados : null;
  return (
    <Modal aberto={id !== null} titulo={v ? `Venda ${v.numero_pedido}` : "Venda"} onFechar={onFechar} largo>
      <AvisoErro erro={detalhe.erro} className="mb-4" />
      {v ? (
        <div className="space-y-5 text-sm">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
            <Item rotulo="Data" valor={dataHoraBRdoIso(v.criado_em)} />
            <Item rotulo="Situação" valor={v.status} />
            <Item rotulo="Cliente" valor={`${v.cliente} · ${v.cliente_cpf}`} />
            <Item rotulo="Loja" valor={`${v.loja} (${rotuloDoCanal(v.canal_venda)})`} />
            <Item rotulo="Vendedor" valor={v.vendedor ?? "—"} />
            <Item rotulo="Pagamento" valor={v.metodo_pagamento ?? "—"} />
          </dl>
          <Tabela>
            <thead>
              <tr>
                <th className={th}>Peça</th>
                <th className={th}>Qtd.</th>
                <th className={th}>Preço</th>
                <th className={th}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {v.itens_da_venda.map((p) => (
                <tr key={`${p.sku}`}>
                  <td className={td}>
                    <p>{rotuloDaPeca(p)}</p>
                    <p className="text-xs text-suave">{p.sku}</p>
                  </td>
                  <td className={`${td} tabular-nums`}>{p.quantidade}</td>
                  <td className={`${td} tabular-nums`}>{moedaBR(p.preco_unitario)}</td>
                  <td className={`${td} tabular-nums`}>{moedaBR(p.valor_total)}</td>
                </tr>
              ))}
            </tbody>
          </Tabela>
          <p className="text-right text-base">
            Total <strong className="tabular-nums">{moedaBR(v.valor_total)}</strong>
          </p>
        </div>
      ) : detalhe.carregando ? (
        <p className="text-sm text-suave">Carregando a venda…</p>
      ) : null}
    </Modal>
  );
}

const Item = ({ rotulo, valor }: { rotulo: string; valor: string }) => (
  <div>
    <dt className="text-xs uppercase tracking-wide text-suave">{rotulo}</dt>
    <dd>{valor}</dd>
  </div>
);
