import { useEffect, useState } from "react";
import {
  AvisoErro,
  Badge,
  Botao,
  Campo,
  Card,
  LinhaVazia,
  Modal,
  Segmentado,
  Tabela,
  Titulo,
  cn,
  inputClasses,
  linhaClicavel,
  td,
  th,
} from "@/components/ui";
import { useConsulta } from "@/hooks/useChamados";
import { useAtraso } from "@/hooks/useClientes";
import { dataBRdoIso, moedaBR } from "@/lib/chamadosUi";
import { listarClientes } from "@/lib/clientesApi";
import { useAcao } from "@/lib/useAcao";
import {
  GRUPOS_DE_MOTIVO,
  buscarVariacoes,
  buscarVendaPendente,
  descartarVenda,
  importarVenda,
  listarFila,
  rotuloMotivo,
  type EstadoDaVenda,
  type VariacaoSugerida,
  type VendaPendente,
} from "@/lib/vendasPendentesApi";

const POR_PAGINA = 50;
const ESTADOS: { value: EstadoDaVenda; label: string }[] = [
  { value: "pendente", label: "Pendentes" },
  { value: "importada", label: "Importadas" },
  { value: "descartada", label: "Descartadas" },
];
const tomEstado = { pendente: "alerta", importada: "ok", descartada: "neutro" } as const;

/**
 * Vendas do Vulto que a importação não conseguiu virar pedido. O admin escolhe o cliente, as peças e
 * o total e importa como pedido (na loja e data da venda original, sem gerar pontos novos), ou
 * descarta dizendo o porquê. CPF, telefone e e-mail da venda nunca chegam à tela.
 */
export function VendasPendentes() {
  const [estado, setEstado] = useState<EstadoDaVenda>("pendente");
  const [grupo, setGrupo] = useState("");
  const [pagina, setPagina] = useState(0);
  const [aberta, setAberta] = useState<string | null>(null);

  const filtro = { estado, grupo: grupo || undefined, limit: POR_PAGINA, offset: pagina * POR_PAGINA };
  const fila = useConsulta((sinal) => listarFila(filtro, { sinal }), `vendas-pendentes:${JSON.stringify(filtro)}`);
  const itens = fila.dados?.itens ?? [];
  const total = fila.dados?.total ?? 0;

  return (
    <div>
      <Titulo
        titulo="Vendas pendentes"
        descricao="Vendas do Vulto que a importação não conseguiu virar pedido. Resolva uma a uma: importe com o cliente e as peças certas, ou descarte."
      />

      <div className="mb-4">
        <Segmentado
          valor={estado}
          onChange={(v) => {
            setEstado(v);
            setGrupo("");
            setPagina(0);
          }}
          opcoes={ESTADOS}
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por motivo">
        <Chip ativo={!grupo} onClick={() => (setGrupo(""), setPagina(0))}>
          Todos os motivos
        </Chip>
        {(fila.dados?.por_grupo ?? []).map((g) => (
          <Chip key={g.grupo} ativo={grupo === g.grupo} onClick={() => (setGrupo(g.grupo), setPagina(0))}>
            {GRUPOS_DE_MOTIVO[g.grupo] ?? g.grupo} <span className="tabular-nums opacity-70">{g.vendas.toLocaleString("pt-BR")}</span>
          </Chip>
        ))}
      </div>

      <AvisoErro erro={fila.erro} className="mb-4" />

      <Card>
        <div aria-busy={fila.carregando} className={cn("transition-opacity", fila.carregando && "opacity-60")}>
          <Tabela>
            <thead>
              <tr>
                <th className={th}>Venda</th>
                <th className={th}>Motivos</th>
                <th className={th}>Itens</th>
                <th className={th}>Status na Vulto</th>
                <th className={th}>{estado === "pendente" ? "Na fila desde" : "Resolvida em"}</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((v) => (
                <tr key={v.id_venda_pendente} onClick={() => setAberta(v.id_venda_pendente)} className={linhaClicavel}>
                  <td className={`${td} font-mono text-xs`}>#{v.venda_id_origem}</td>
                  <td className={td}>
                    <ul className="space-y-0.5 text-[13px]">
                      {v.motivos.map((m) => (
                        <li key={m}>{rotuloMotivo(m)}</li>
                      ))}
                    </ul>
                  </td>
                  <td className={`${td} tabular-nums`}>{v.quantidade_itens}</td>
                  <td className={td}>{v.status_origem ?? "—"}</td>
                  <td className={td}>{dataBRdoIso(v.resolvida_em ?? v.criada_em)}</td>
                </tr>
              ))}
              {itens.length === 0 ? (
                <LinhaVazia colunas={5} texto={fila.carregando ? "Carregando a fila…" : "Nenhuma venda aqui."} />
              ) : null}
            </tbody>
          </Tabela>
        </div>
        {total > POR_PAGINA ? (
          <div className="flex items-center justify-between border-t border-linha px-5 py-3 text-sm text-suave">
            <span>
              {pagina * POR_PAGINA + 1}–{Math.min((pagina + 1) * POR_PAGINA, total)} de {total.toLocaleString("pt-BR")}
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

      {aberta ? (
        <Resolucao
          id={aberta}
          onFechar={() => setAberta(null)}
          onResolvida={() => {
            setAberta(null);
            fila.recarregar();
          }}
        />
      ) : null}
    </div>
  );
}

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
        ativo ? "border-marinho bg-marinho text-white" : "border-linha bg-papel text-suave hover:border-marinho",
      )}
    >
      {children}
    </button>
  );
}

type Linha = { incluir: boolean; variacao: VariacaoSugerida | null; quantidade: string; preco: string };

const paraTexto = (n: number | null | undefined) => (n === null || n === undefined ? "" : n.toFixed(2));
const paraNumero = (s: string) => Number(s.replace(",", "."));

function Resolucao({ id, onFechar, onResolvida }: { id: string; onFechar: () => void; onResolvida: () => void }) {
  const venda = useConsulta((sinal) => buscarVendaPendente(id, { sinal }), `venda-pendente:${id}`);
  const d = venda.dados;
  return (
    <Modal aberto titulo={d ? `Venda #${d.venda_id_origem}` : "Venda"} onFechar={onFechar} largo>
      <AvisoErro erro={venda.erro} className="mb-4" />
      {d ? <FormularioDeResolucao key={d.id_venda_pendente} venda={d} onResolvida={onResolvida} /> : <p className="text-sm text-suave">Carregando a venda…</p>}
    </Modal>
  );
}

function FormularioDeResolucao({ venda: d, onResolvida }: { venda: VendaPendente; onResolvida: () => void }) {
  const { executar, ocupado, erro, limparErro } = useAcao();
  const [cliente, setCliente] = useState<{ id: string; nome: string } | null>(
    d.sugestao_cliente ? { id: d.sugestao_cliente.id_cliente, nome: d.sugestao_cliente.nome } : null,
  );
  const [linhas, setLinhas] = useState<Linha[]>(() =>
    d.itens.map((i) => ({
      incluir: i.quantidade > 0,
      variacao: i.variacao_sugerida,
      quantidade: String(Math.max(i.quantidade, 1)),
      preco: paraTexto(i.preco_unitario),
    })),
  );
  const [valorTotal, setValorTotal] = useState(paraTexto(d.total ?? d.total_calculado));
  const [frete, setFrete] = useState(paraTexto(d.frete));
  const [porque, setPorque] = useState("");
  const pendente = d.estado === "pendente";

  const escolhidas = linhas.filter((l) => l.incluir);
  const somaItens = escolhidas.reduce((s, l) => s + paraNumero(l.quantidade) * paraNumero(l.preco), 0);
  const repetida = new Set(escolhidas.map((l) => l.variacao?.id_variacao)).size !== escolhidas.length;
  const podeImportar =
    !!cliente &&
    escolhidas.length > 0 &&
    escolhidas.every((l) => l.variacao && Number.isInteger(paraNumero(l.quantidade)) && paraNumero(l.quantidade) > 0 && paraNumero(l.preco) >= 0) &&
    !repetida &&
    paraNumero(valorTotal) >= 0 &&
    valorTotal !== "" &&
    !!d.loja &&
    !!d.status_destino &&
    !!d.vendida_em;

  const mudar = (i: number, m: Partial<Linha>) => setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, ...m } : l)));

  return (
    <div className="space-y-6 text-sm">
      <AvisoErro erro={erro} onFechar={limparErro} />

      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-3">
        <Info rotulo="Vendida em" valor={d.vendida_em ? dataBRdoIso(d.vendida_em) : "não reconhecida"} />
        <Info rotulo="Loja" valor={d.loja ?? "não reconhecida"} />
        <Info rotulo="Canal" valor={d.canal === "online" ? "Online" : d.canal === "loja" ? "Loja física" : "—"} />
        <Info rotulo="Status" valor={`${d.status_origem ?? "—"} → ${d.status_destino ?? "não reconhecido"}`} />
        <Info rotulo="Vendedor" valor={d.vendedor ?? "—"} />
        <Info rotulo="Total na Vulto" valor={d.total === null ? "—" : moedaBR(d.total)} nota={d.total_calculado !== null ? `itens somam ${moedaBR(d.total_calculado)}` : undefined} />
      </div>

      <div>
        <p className="rotulo mb-1.5">{pendente ? "Por que ficou pendente" : "Motivos"}</p>
        <div className="flex flex-wrap gap-1.5">
          {d.motivos.map((m) => (
            <Badge key={m} tom="alerta">
              {rotuloMotivo(m)}
            </Badge>
          ))}
          {!pendente ? <Badge tom={tomEstado[d.estado]}>{d.estado === "importada" ? "Importada" : "Descartada"}</Badge> : null}
        </div>
        {d.observacao_resolucao ? <p className="mt-2 text-suave">“{d.observacao_resolucao}”</p> : null}
      </div>

      {pendente ? (
        <>
          <section>
            <p className="rotulo mb-1.5">Cliente</p>
            {d.cpf_final ? <p className="mb-2 text-xs text-suave">CPF da venda termina em {d.cpf_final}.</p> : null}
            <EscolhaDeCliente cliente={cliente} onEscolher={setCliente} />
          </section>

          <section>
            <p className="rotulo mb-1.5">Peças</p>
            <div className="space-y-3">
              {d.itens.map((item, i) => {
                const l = linhas[i]!;
                return (
                  <div key={i} className={cn("rounded-sm border border-linha p-3", !l.incluir && "opacity-60")}>
                    <label className="flex items-start gap-2">
                      <input type="checkbox" checked={l.incluir} onChange={(e) => mudar(i, { incluir: e.target.checked })} className="mt-1" />
                      <span>
                        <span className="font-medium">{item.descricao ?? "Sem descrição"}</span>
                        <span className="ml-2 font-mono text-[11px] text-suave">{item.sku_origem}</span>
                        {item.quantidade <= 0 ? <span className="ml-2 text-xs text-perigo">quantidade {item.quantidade} na origem</span> : null}
                      </span>
                    </label>
                    {l.incluir ? (
                      <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_90px_120px]">
                        <EscolhaDePeca variacao={l.variacao} onEscolher={(v) => mudar(i, { variacao: v })} />
                        <Campo label="Qtd.">
                          <input value={l.quantidade} onChange={(e) => mudar(i, { quantidade: e.target.value })} inputMode="numeric" className={inputClasses} />
                        </Campo>
                        <Campo label="Preço un. (R$)">
                          <input value={l.preco} onChange={(e) => mudar(i, { preco: e.target.value })} inputMode="decimal" className={inputClasses} />
                        </Campo>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {repetida ? <p className="mt-2 text-xs text-perigo">A mesma peça está em duas linhas: junte as quantidades numa linha só.</p> : null}
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <Campo label="Total do pedido (R$)">
              <input value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} inputMode="decimal" className={inputClasses} />
            </Campo>
            <Campo label="Frete (R$)">
              <input value={frete} onChange={(e) => setFrete(e.target.value)} inputMode="decimal" className={inputClasses} />
            </Campo>
            <p className="self-end pb-2 text-xs text-suave">Itens escolhidos somam {moedaBR(somaItens)}.</p>
          </section>

          <div className="flex flex-wrap items-end justify-between gap-4 border-t border-linha pt-4">
            <Botao
              disabled={!podeImportar || ocupado !== null}
              onClick={() =>
                void executar("importar", async () => {
                  await importarVenda(d.id_venda_pendente, {
                    id_cliente: cliente!.id,
                    valor_total: paraNumero(valorTotal),
                    valor_frete: paraNumero(frete || "0"),
                    itens: escolhidas.map((l) => ({
                      id_variacao: l.variacao!.id_variacao,
                      quantidade: paraNumero(l.quantidade),
                      preco_unitario: paraNumero(l.preco),
                    })),
                  });
                  onResolvida();
                })
              }
            >
              {ocupado === "importar" ? "Importando…" : "Importar como pedido"}
            </Botao>
            <div className="flex flex-1 flex-wrap items-end justify-end gap-2">
              <Campo label="Por que descartar" className="min-w-56 flex-1">
                <input value={porque} onChange={(e) => setPorque(e.target.value)} maxLength={300} placeholder="Ex.: venda de teste, duplicada…" className={inputClasses} />
              </Campo>
              <Botao
                variante="secundario"
                disabled={porque.trim().length < 3 || ocupado !== null}
                onClick={() =>
                  void executar("descartar", async () => {
                    await descartarVenda(d.id_venda_pendente, porque.trim());
                    onResolvida();
                  })
                }
              >
                Descartar
              </Botao>
            </div>
          </div>
          {!d.loja || !d.status_destino || !d.vendida_em ? (
            <p className="text-xs text-perigo">Loja, status ou data da venda não reconhecidos: esta venda só pode ser descartada.</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Info({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return (
    <div>
      <p className="rotulo">{rotulo}</p>
      <p className="mt-0.5">{valor}</p>
      {nota ? <p className="text-xs text-suave">{nota}</p> : null}
    </div>
  );
}

/** Busca no cadastro de clientes (nome, e-mail ou telefone). */
function EscolhaDeCliente({ cliente, onEscolher }: { cliente: { id: string; nome: string } | null; onEscolher: (c: { id: string; nome: string } | null) => void }) {
  const [busca, setBusca] = useState("");
  const termo = useAtraso(busca);
  const achados = useConsulta(
    (sinal) => listarClientes({ busca: termo, secao: "todos", limit: 8, offset: 0 }, { sinal }),
    `fila-clientes:${termo}`,
    { ativa: termo.trim().length >= 2 },
  );
  if (cliente) {
    return (
      <p className="flex items-center gap-3">
        <span className="font-medium">{cliente.nome}</span>
        <button type="button" onClick={() => onEscolher(null)} className="text-xs text-suave underline hover:text-tinta">
          trocar
        </button>
      </p>
    );
  }
  return (
    <div>
      <input value={busca} onChange={(e) => setBusca(e.target.value)} maxLength={80} placeholder="Buscar cliente por nome, e-mail ou telefone" className={inputClasses} />
      {termo.trim().length >= 2 ? (
        <ul className="mt-1 divide-y divide-linha rounded-sm border border-linha">
          {(achados.dados?.itens ?? []).map((c) => (
            <li key={c.id_cliente}>
              <button type="button" onClick={() => onEscolher({ id: c.id_cliente, nome: c.nome })} className="w-full px-3 py-2 text-left hover:bg-areia/50">
                {c.nome} <span className="text-xs text-suave">{c.email ?? c.telefone ?? ""}</span>
              </button>
            </li>
          ))}
          {achados.dados && achados.dados.itens.length === 0 ? <li className="px-3 py-2 text-suave">Nenhum cliente encontrado.</li> : null}
        </ul>
      ) : null}
    </div>
  );
}

/** Busca de peça por SKU ou nome, para trocar o SKU que a venda de origem não encontrou. */
function EscolhaDePeca({ variacao, onEscolher }: { variacao: VariacaoSugerida | null; onEscolher: (v: VariacaoSugerida | null) => void }) {
  const [busca, setBusca] = useState("");
  const termo = useAtraso(busca);
  const [achadas, setAchadas] = useState<VariacaoSugerida[] | null>(null);
  useEffect(() => {
    if (termo.trim().length < 2) return;
    const controle = new AbortController();
    buscarVariacoes(termo.trim(), { sinal: controle.signal })
      .then(setAchadas)
      .catch(() => setAchadas([]));
    return () => controle.abort();
  }, [termo]);

  if (variacao) {
    return (
      <div>
        <p className="rotulo mb-1">Peça</p>
        <p>
          <span className="font-mono text-xs">{variacao.sku}</span> · {variacao.nome}{" "}
          <button type="button" onClick={() => onEscolher(null)} className="text-xs text-suave underline hover:text-tinta">
            trocar
          </button>
        </p>
      </div>
    );
  }
  return (
    <div>
      <p className="rotulo mb-1">Peça</p>
      <input value={busca} onChange={(e) => setBusca(e.target.value)} maxLength={80} placeholder="Buscar por SKU ou nome" className={inputClasses} />
      {termo.trim().length >= 2 && achadas ? (
        <ul className="mt-1 max-h-48 divide-y divide-linha overflow-y-auto rounded-sm border border-linha">
          {achadas.map((v) => (
            <li key={v.id_variacao}>
              <button type="button" onClick={() => onEscolher(v)} className="w-full px-3 py-2 text-left hover:bg-areia/50">
                <span className="font-mono text-xs">{v.sku}</span> · {v.nome}
              </button>
            </li>
          ))}
          {achadas.length === 0 ? <li className="px-3 py-2 text-suave">Nenhuma peça encontrada.</li> : null}
        </ul>
      ) : null}
    </div>
  );
}
