import { useEffect, useRef, useState } from "react";
import { AvisoErro, Botao, Campo, Modal, Select, inputClasses } from "@/components/ui";
import { ErroApi } from "@/api/erros";
import { useAtraso } from "@/hooks/useClientes";
import { useOpcoesDeVenda, usePecasDaLoja } from "@/hooks/useVendas";
import { useAcao } from "@/lib/useAcao";
import { cpfValido, formatarCpf } from "@/lib/cadastro";
import { moedaBR } from "@/lib/chamadosUi";
import {
  adicionarPeca,
  montarVenda,
  OBSERVACAO_MAXIMA,
  mudarQuantidade,
  rotuloDaPeca,
  totalDePecas,
  totalDoCarrinho,
  validarVenda,
  type ErrosVenda,
  type LinhaDoCarrinho,
} from "@/lib/vendasUi";
import { buscarClientePorCpf, lancarVenda, type ClienteDeVenda, type DetalheVenda, type MetodoDePagamento } from "@/lib/vendasApi";

const novaChave = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const mensagem = (e: unknown) => (e instanceof ErroApi ? e.message : "Não foi possível agora. Tente de novo em instantes.");

/**
 * Lançar venda em loja: acha o cliente pelo CPF, escolhe as peças com saldo na loja do vendedor e a
 * forma de pagamento. O servidor confere o saldo, baixa o estoque e grava a venda de uma vez.
 */
export function NovaVenda({
  aberto,
  onFechar,
  aoLancar,
}: {
  aberto: boolean;
  onFechar: () => void;
  aoLancar: (venda: DetalheVenda) => void;
}) {
  const [cpf, setCpf] = useState("");
  const [cliente, setCliente] = useState<ClienteDeVenda | null>(null);
  const [erroCpf, setErroCpf] = useState<string | null>(null);
  const [buscandoCpf, setBuscandoCpf] = useState(false);
  const [termo, setTermo] = useState("");
  const [carrinho, setCarrinho] = useState<LinhaDoCarrinho[]>([]);
  const [metodo, setMetodo] = useState<MetodoDePagamento | "">("");
  const [observacao, setObservacao] = useState("");
  const [erros, setErros] = useState<ErrosVenda>({});
  const acao = useAcao();
  const opcoes = useOpcoesDeVenda(aberto);
  const busca = useAtraso(termo);
  const pecas = usePecasDaLoja(busca, aberto);
  const chave = useRef(novaChave());

  // Venda diferente = chave diferente: repetir a mesma chave devolveria a venda anterior.
  useEffect(() => {
    chave.current = novaChave();
  }, [cliente, carrinho, metodo, observacao]);

  useEffect(() => {
    if (aberto) return;
    setCpf("");
    setCliente(null);
    setErroCpf(null);
    setTermo("");
    setCarrinho([]);
    setMetodo("");
    setObservacao("");
    setErros({});
    acao.limparErro();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  async function buscarCliente() {
    setCliente(null);
    setErroCpf(null);
    if (!cpfValido(cpf)) return setErroCpf("Confira o CPF.");
    setBuscandoCpf(true);
    try {
      setCliente(await buscarClientePorCpf(cpf));
    } catch (e) {
      setErroCpf(mensagem(e));
    } finally {
      setBuscandoCpf(false);
    }
  }

  async function lancar() {
    const encontrados = validarVenda(cliente?.id_cliente ?? null, carrinho, metodo);
    setErros(encontrados);
    if (Object.keys(encontrados).length || !metodo) return;
    await acao.executar("lancar", async () => {
      aoLancar(await lancarVenda(montarVenda(cpf, carrinho, metodo, observacao), chave.current));
    });
  }

  const lojaNome = opcoes.dados?.loja;
  const resultados = (pecas.dados ?? []).filter((p) => p.disponivel > 0);

  return (
    <Modal aberto={aberto} titulo="Nova venda" onFechar={onFechar} largo>
      <div className="space-y-6 text-sm">
        <section className="space-y-2">
          <h3 className="font-medium">1. Cliente</h3>
          <div className="flex items-end gap-3">
            <Campo label="CPF do cliente" className="flex-1">
              <input
                value={cpf}
                onChange={(e) => {
                  setCpf(formatarCpf(e.target.value));
                  setCliente(null);
                  setErroCpf(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void buscarCliente())}
                inputMode="numeric"
                placeholder="000.000.000-00"
                className={inputClasses}
              />
            </Campo>
            <Botao variante="secundario" onClick={() => void buscarCliente()} disabled={buscandoCpf}>
              {buscandoCpf ? "Buscando…" : "Buscar"}
            </Botao>
          </div>
          {erroCpf ? <p className="text-xs text-perigo">{erroCpf}</p> : null}
          {cliente ? (
            <p className="rounded-sm border border-linha bg-areia/40 px-3 py-2" role="status">
              <strong>{cliente.nome}</strong> · {cliente.cpf}
              {cliente.telefone ? ` · ${cliente.telefone}` : ""}
            </p>
          ) : null}
          {erros.cliente ? <p className="text-xs text-perigo">{erros.cliente}</p> : null}
        </section>

        <section className="space-y-2">
          <h3 className="font-medium">2. Peças{lojaNome ? ` (estoque de ${lojaNome})` : ""}</h3>
          <Campo label="Buscar peça">
            <input
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              maxLength={80}
              placeholder="Nome, SKU ou código de barras"
              className={inputClasses}
            />
          </Campo>
          <AvisoErro erro={pecas.erro} />
          <ul className="max-h-40 divide-y divide-linha overflow-y-auto rounded-sm border border-linha">
            {resultados.map((p) => (
              <li key={p.id_variacao} className="flex items-center justify-between gap-3 px-3 py-2">
                <span>
                  {rotuloDaPeca(p)}
                  <span className="block text-xs text-suave">
                    {p.sku} · {moedaBR(p.preco_venda)} · {p.disponivel} em estoque
                  </span>
                </span>
                <Botao variante="secundario" pequeno onClick={() => setCarrinho((c) => adicionarPeca(c, p))}>
                  Adicionar
                </Botao>
              </li>
            ))}
            {resultados.length === 0 ? (
              <li className="px-3 py-4 text-center text-suave">
                {pecas.carregando ? "Buscando…" : "Nenhuma peça com saldo nesta loja."}
              </li>
            ) : null}
          </ul>

          {carrinho.length ? (
            <ul className="divide-y divide-linha rounded-sm border border-linha">
              {carrinho.map((l) => (
                <li key={l.peca.id_variacao} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span>
                    {rotuloDaPeca(l.peca)}
                    <span className="block text-xs text-suave">{moedaBR(l.peca.preco_venda)} cada</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={l.peca.disponivel}
                      value={l.quantidade}
                      onChange={(e) => setCarrinho((c) => mudarQuantidade(c, l.peca.id_variacao, Number(e.target.value)))}
                      aria-label={`Quantidade de ${rotuloDaPeca(l.peca)}`}
                      className={`${inputClasses} w-20`}
                    />
                    <span className="w-24 text-right tabular-nums">{moedaBR(l.peca.preco_venda * l.quantidade)}</span>
                    <Botao variante="fantasma" pequeno onClick={() => setCarrinho((c) => mudarQuantidade(c, l.peca.id_variacao, 0))}>
                      Tirar
                    </Botao>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {erros.itens ? <p className="text-xs text-perigo">{erros.itens}</p> : null}
        </section>

        <section className="space-y-2">
          <h3 className="font-medium">3. Pagamento</h3>
          <Select
            value={metodo}
            onChange={(e) => setMetodo(e.target.value as MetodoDePagamento | "")}
            opcoes={[{ value: "", label: "Escolha a forma de pagamento" }, ...(opcoes.dados?.metodos ?? []).map((m) => ({ value: m.codigo, label: m.nome }))]}
          />
          {erros.pagamento ? <p className="text-xs text-perigo">{erros.pagamento}</p> : null}
          <Campo label="Observação (opcional)" ajuda="Troca na loja: escreva “troca”. A peça nova sai do estoque como venda.">
            <input
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              maxLength={OBSERVACAO_MAXIMA}
              placeholder="ex.: troca"
              className={inputClasses}
            />
          </Campo>
        </section>

        <AvisoErro erro={acao.erro} />
        <div className="flex items-center justify-between border-t border-linha pt-4">
          <p className="text-base">
            {totalDePecas(carrinho)} {totalDePecas(carrinho) === 1 ? "peça" : "peças"} ·{" "}
            <strong className="tabular-nums">{moedaBR(totalDoCarrinho(carrinho))}</strong>
          </p>
          <div className="flex gap-2">
            <Botao variante="secundario" onClick={onFechar}>
              Cancelar
            </Botao>
            <Botao onClick={() => void lancar()} disabled={acao.ocupado !== null}>
              {acao.ocupado ? "Lançando…" : "Lançar venda"}
            </Botao>
          </div>
        </div>
      </div>
    </Modal>
  );
}
