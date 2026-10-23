import QRCode from "qrcode";
import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { usandoApi } from "@/api/config";
import { ErroApi } from "@/api/erros";
import { cn } from "@/components/ui";
import { Foto, botaoLoja } from "@/components/vitrine";
import { lojas, moeda } from "@/lib/dados";
import { fecharPedidoCliente, listarLojasCliente, type LojaClienteApi } from "@/lib/comprasClienteApi";
import { ENDERECO_VAZIO, formatarCep, preencherComCadastro } from "@/lib/cadastro";
import { casas, fotoEstudio } from "@/lib/loja";
import { obterPerfilCliente } from "@/lib/perfilClienteApi";
import { novaChaveIdempotencia } from "@/api/http";
import * as acoes from "@/lib/acoes";
import { useSessao } from "@/lib/sessao";
import { useEstado } from "@/lib/store";
import { useProdutosCatalogo } from "@/lib/catalogoApi";
import { grupoDaLoja, nomeDaLoja } from "@/lib/lojasAgrupadas";
import { lojaFisica, temTudo } from "@/lib/retirada";
import { useAcao } from "@/lib/useAcao";
import { useLorenziMais } from "@/hooks/useLorenziMais";
import { SinalMais } from "@/components/marca";
import { descontoDosPontos, maximoResgatavel, pontosDaCompra } from "@/lib/regrasLorenziMais";
import { pontos as fmtPontos } from "@/lib/vultoMais";
import { freteDe } from "./Sacola";

const estados = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

/** Campo de formulário da loja: rótulo simples acima, sem caixa alta. */
export const campoLoja =
  "w-full border border-linha bg-pergaminho px-3.5 py-3 text-[15px] outline-none transition-colors placeholder:text-suave/70 focus:border-tinta";

export function CampoLoja({ rotulo, children, className }: { rotulo: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm text-suave">{rotulo}</span>
      {children}
    </label>
  );
}

type Pagamento = "cartao" | "pix" | "boleto";
const metodoPagamentoApi = (pagamento: Pagamento) => (pagamento === "cartao" ? "cartao_credito" : pagamento);

function Etapa({ numero, titulo, children }: { numero: number; titulo: string; children: ReactNode }) {
  return (
    <section className="alinhavo py-9">
      <h2 className="mb-6 flex items-baseline gap-4 text-[32px]">
        <span className="font-display text-caramelo">{numero}</span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Opcao({ ativa, onClick, titulo, nota }: { ativa: boolean; onClick: () => void; titulo: string; nota: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border-[1.5px] p-4 text-left transition-colors",
        ativa ? "border-dashed border-tinta bg-pergaminho" : "border-linha hover:border-tinta/50",
      )}
    >
      <span className="block font-display text-xl">{titulo}</span>
      <span className="text-sm text-suave">{nota}</span>
    </button>
  );
}

export function Checkout() {
  const estado = useEstado();
  const { carrinho } = estado;
  const { produtos: produtosCatalogo } = useProdutosCatalogo(estado.produtos);
  const sessao = useSessao();
  const modoApi = usandoApi();
  const [entrega, setEntrega] = useState<"casa" | "loja">("casa");
  const [lojaRetirada, setLojaRetirada] = useState(lojas[0]!.id);
  const [lojasApi, setLojasApi] = useState<LojaClienteApi[]>([]);
  const [erroLojas, setErroLojas] = useState<string | null>(null);
  const [pagamento, setPagamento] = useState<Pagamento>("cartao");
  const [parcelas, setParcelas] = useState("1");
  const [endereco, setEndereco] = useState(ENDERECO_VAZIO);
  const [doCadastro, setDoCadastro] = useState(false);
  const [qrPix, setQrPix] = useState<string | null>(null);
  const [pedido, setPedido] = useState<string | null>(null);
  // Uma chave por tentativa de compra: duplo clique ou reenvio não criam dois pedidos.
  const [chave] = useState(novaChaveIdempotencia);
  const { executar, ocupado, erro } = useAcao();
  const lorenziMais = useLorenziMais();
  const [pontosEscolhidos, setPontosEscolhidos] = useState(0);

  const subtotal = carrinho.reduce((s, i) => s + i.valor * i.quantidade, 0);
  const frete = entrega === "loja" ? 0 : freteDe(subtotal);
  // Lorenzi+: o desconto sai das peças (nunca do frete) e não passa do saldo.
  const regras = lorenziMais?.regras;
  const maximoDePontos = lorenziMais ? maximoResgatavel(lorenziMais.saldo, subtotal, regras) : 0;
  const pontosUsados = Math.min(pontosEscolhidos, maximoDePontos);
  const desconto = descontoDosPontos(pontosUsados, regras);
  const total = subtotal - desconto + frete;
  const pontosGanhos = pontosDaCompra(total, true, regras);
  const [ganhou, setGanhou] = useState<number | null>(null);
  const codigoPix = `00020126BR.GOV.BCB.PIX.CASALORENZI520400005303986540${total.toFixed(2)}5802BR5913CASA LORENZI6009SAO PAULO6304LRZI`;
  // Retirada: só lojas físicas que têm todas as peças da sacola, na quantidade pedida.
  const lojasParaEscolher = lojasApi.length
    ? lojasApi
        .filter((loja) => lojaFisica(loja.nome) && temTudo(loja.id_loja, carrinho, produtosCatalogo))
        .map((loja) => ({
          id: loja.id_loja,
          nome: nomeDaLoja(loja.nome),
          nota: [loja.cidade, loja.uf].filter(Boolean).join(", ") || loja.endereco || "Retirada na loja",
        }))
    : lojas.map((loja) => ({ id: loja.id, nome: loja.nome, nota: casas[loja.id]?.provas ?? loja.cidade }));
  const lojaDeRetirada = lojasParaEscolher.find((l) => l.id === lojaRetirada)?.id ?? lojasParaEscolher[0]?.id ?? "";
  // Entrega em casa: o pedido sai do E-commerce Casa Lorenzi, o canal online das duas marcas.
  const idLojaSeparacao =
    lojasApi.find((loja) => grupoDaLoja(loja.nome) === "Online · as duas marcas")?.id_loja ?? lojasApi[0]?.id_loja ?? lojas[0]!.id;
  const semLojaParaRetirada = entrega === "loja" && modoApi && lojasApi.length > 0 && lojasParaEscolher.length === 0;
  // Peça sem estoque no e-commerce (hoje, as da Casa Lorenzi) só sai por retirada na loja.
  const semEstoqueOnline =
    entrega === "casa" && modoApi && lojasApi.length > 0 && produtosCatalogo.length > 0 && !temTudo(idLojaSeparacao, carrinho, produtosCatalogo);
  const aguardandoLojas = modoApi && lojasApi.length === 0 && !erroLojas;

  useEffect(() => {
    if (pagamento !== "pix") return;
    let ativo = true;
    void QRCode.toDataURL(codigoPix, { margin: 1, width: 320, color: { dark: "#16203a", light: "#faf8f4" } }).then(
      (url) => ativo && setQrPix(url),
    );
    return () => {
      ativo = false;
    };
  }, [pagamento, codigoPix]);

  useEffect(() => {
    if (sessao?.tipo !== "cliente") return;
    void acoes.sincronizarCarrinho().catch(() => undefined);
  }, [sessao?.tipo]);

  // O endereço do cadastro já vem preenchido (e continua editável, se a entrega for em outro lugar).
  useEffect(() => {
    if (!modoApi || sessao?.tipo !== "cliente") return;
    let ativo = true;
    obterPerfilCliente()
      .then((perfil) => {
        if (!ativo || !perfil.rua) return;
        setEndereco((atual) => preencherComCadastro(atual, perfil));
        setDoCadastro(true);
      })
      .catch(() => undefined); // sem o perfil o formulário só fica em branco
    return () => {
      ativo = false;
    };
  }, [modoApi, sessao?.tipo]);

  useEffect(() => {
    if (!modoApi || sessao?.tipo !== "cliente") return;
    let ativo = true;
    listarLojasCliente()
      .then((lista) => {
        if (!ativo) return;
        setLojasApi(lista);
        if (!lista[0]) setErroLojas("Nenhuma loja ativa foi encontrada para separar este pedido.");
      })
      .catch(() => {
        if (!ativo) return;
        setErroLojas("Não foi possível carregar as lojas disponíveis para este pedido.");
      });
    return () => {
      ativo = false;
    };
  }, [modoApi, sessao?.tipo]);

  if (pedido) {
    const casa = entrega === "loja" ? lojasParaEscolher.find((l) => l.id === lojaDeRetirada) : null;
    return (
      <div className="mx-auto max-w-xl px-5 py-20 text-center">
        <p className="text-[15px] text-caramelo">Pedido {pedido}</p>
        <h1 className="mt-2 text-[56px] leading-none">Obrigado.</h1>
        <p className="mt-5 font-display text-xl leading-normal">
          {casa
            ? `Suas peças ficam prontas em dois dias úteis na casa ${casa.nome}. O alfaiate faz o ajuste na hora da retirada.`
            : "Suas peças já estão sendo separadas no ateliê. Mandamos o código de rastreio assim que saírem."}
        </p>
        {ganhou ? (
          <p className="mt-5 flex items-center justify-center gap-2 text-[15px] text-suave">
            <SinalMais className="text-[15px]" />
            Esta compra rendeu {fmtPontos(ganhou)} pontos Lorenzi+.
          </p>
        ) : null}
        <p className="mt-6 font-mao text-[14px] leading-relaxed text-caramelo">— com carinho, Casa Lorenzi</p>
        <Link to="/conta/pedidos" className={cn(botaoLoja(), "mt-10")}>
          Acompanhar o pedido
        </Link>
      </div>
    );
  }

  if (!pedido && carrinho.length === 0) return <Navigate to="/sacola" replace />;

  return (
    <div className="mx-auto max-w-[1180px] px-5 pt-10 md:px-12">
      <h1 className="text-[56px] leading-none md:text-[64px]">Fechar o pedido</h1>

      <form
        className="mt-6 grid gap-12 lg:grid-cols-[1fr_24rem]"
        onSubmit={(e) => {
          e.preventDefault();
          if (sessao?.tipo !== "cliente") return;
          void executar("pedido", async () => {
            const idLoja = entrega === "loja" ? lojaDeRetirada : idLojaSeparacao;
            if (modoApi) {
              const itens = carrinho.map((item) => {
                if (!item.idVariacao) {
                  throw new ErroApi("validacao", "Atualize a peça pela loja antes de concluir a compra.");
                }
                return { id_variacao: item.idVariacao, quantidade: item.quantidade };
              });
              const novo = await fecharPedidoCliente(
                {
                  id_loja: idLoja,
                  entrega,
                  metodo_pagamento: metodoPagamentoApi(pagamento),
                  frete: frete.toFixed(2),
                  endereco_entrega:
                    entrega === "casa"
                      ? {
                          cep: endereco.cep,
                          rua: endereco.rua,
                          bairro: endereco.bairro || null,
                          numero: endereco.numero,
                          complemento: endereco.complemento || null,
                          uf: endereco.uf,
                        }
                      : null,
                  itens,
                  pontos_resgatados: pontosUsados || undefined,
                },
                chave,
              );
              setGanhou(lorenziMais ? pontosGanhos : null);
              setPedido(novo.numero_pedido);
              await acoes.limparCarrinho();
            } else {
              const novo = await acoes.fecharPedido({ lojaId: idLoja, frete }, chave);
              setPedido(novo.id);
            }
            window.scrollTo(0, 0);
          });
        }}
      >
        <div>
          <Etapa numero={1} titulo="Como as peças chegam até você">
            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              <Opcao
                ativa={entrega === "casa"}
                onClick={() => setEntrega("casa")}
                titulo="Receber em casa"
                nota={freteDe(subtotal) === 0 ? "Entrega por nossa conta" : `Entrega por ${moeda(freteDe(subtotal))}`}
              />
              <Opcao
                ativa={entrega === "loja"}
                onClick={() => setEntrega("loja")}
                titulo="Retirar e ajustar na loja"
                nota="Pronto em 2 dias úteis, ajuste na hora"
              />
            </div>
            {semEstoqueOnline ? (
              <p role="alert" className="mb-6 border border-ferrugem/40 bg-pergaminho p-4 text-sm text-tinta">
                Algumas peças da sua sacola não estão disponíveis para entrega agora. Escolha retirar na loja.
              </p>
            ) : null}
            {entrega === "casa" ? (
              <div className="grid gap-4 sm:grid-cols-6">
                {doCadastro ? (
                  <p className="text-sm text-suave sm:col-span-6">Usamos o endereço do seu cadastro. Se for entregar em outro lugar, é só alterar.</p>
                ) : null}
                <CampoLoja rotulo="CEP" className="sm:col-span-2">
                  <input value={endereco.cep} onChange={(e) => setEndereco((atual) => ({ ...atual, cep: formatarCep(e.target.value) }))} required inputMode="numeric" className={campoLoja} />
                </CampoLoja>
                <CampoLoja rotulo="Rua" className="sm:col-span-4">
                  <input value={endereco.rua} onChange={(e) => setEndereco((atual) => ({ ...atual, rua: e.target.value }))} required className={campoLoja} />
                </CampoLoja>
                <CampoLoja rotulo="Bairro" className="sm:col-span-4">
                  <input value={endereco.bairro} onChange={(e) => setEndereco((atual) => ({ ...atual, bairro: e.target.value }))} required className={campoLoja} />
                </CampoLoja>
                <CampoLoja rotulo="Número" className="sm:col-span-2">
                  <input value={endereco.numero} onChange={(e) => setEndereco((atual) => ({ ...atual, numero: e.target.value }))} required className={campoLoja} />
                </CampoLoja>
                <CampoLoja rotulo="Complemento" className="sm:col-span-2">
                  <input value={endereco.complemento} onChange={(e) => setEndereco((atual) => ({ ...atual, complemento: e.target.value }))} placeholder="Apto, bloco…" className={campoLoja} />
                </CampoLoja>
                <CampoLoja rotulo="Estado" className="sm:col-span-2">
                  <select value={endereco.uf} onChange={(e) => setEndereco((atual) => ({ ...atual, uf: e.target.value }))} className={campoLoja}>
                    {estados.map((e) => (
                      <option key={e}>{e}</option>
                    ))}
                  </select>
                </CampoLoja>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {lojasParaEscolher.map((l) => (
                  <Opcao key={l.id} ativa={lojaDeRetirada === l.id} onClick={() => setLojaRetirada(l.id)} titulo={l.nome} nota={l.nota} />
                ))}
                {semLojaParaRetirada ? (
                  <p className="text-sm text-suave sm:col-span-3">
                    Nenhuma loja tem todas as peças da sua sacola para retirada agora. Escolha receber em casa.
                  </p>
                ) : null}
              </div>
            )}
          </Etapa>

          <Etapa numero={2} titulo="Pagamento">
            <div className="mb-6 grid grid-cols-3 gap-3">
              <Opcao ativa={pagamento === "cartao"} onClick={() => setPagamento("cartao")} titulo="Cartão" nota="até 10x" />
              <Opcao ativa={pagamento === "pix"} onClick={() => setPagamento("pix")} titulo="Pix" nota="na hora" />
              <Opcao ativa={pagamento === "boleto"} onClick={() => setPagamento("boleto")} titulo="Boleto" nota="2 dias úteis" />
            </div>
            {pagamento === "cartao" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <CampoLoja rotulo="Número do cartão" className="sm:col-span-2">
                  <input required inputMode="numeric" placeholder="0000 0000 0000 0000" className={campoLoja} />
                </CampoLoja>
                <CampoLoja rotulo="Nome impresso" className="sm:col-span-2">
                  <input required placeholder="Como está no cartão" className={campoLoja} />
                </CampoLoja>
                <CampoLoja rotulo="Validade">
                  <input required placeholder="MM/AA" className={campoLoja} />
                </CampoLoja>
                <CampoLoja rotulo="Código de segurança">
                  <input required inputMode="numeric" placeholder="123" className={campoLoja} />
                </CampoLoja>
                <CampoLoja rotulo="Parcelas" className="sm:col-span-2">
                  <select value={parcelas} onChange={(e) => setParcelas(e.target.value)} className={campoLoja}>
                    {[1, 2, 3, 6, 10].map((n) => (
                      <option key={n} value={n}>
                        {n === 1 ? `À vista — ${moeda(total)}` : `${n}x de ${moeda(total / n)} sem juros`}
                      </option>
                    ))}
                  </select>
                </CampoLoja>
              </div>
            ) : pagamento === "pix" ? (
              <div className="flex flex-col items-center gap-3 bg-pergaminho p-6 text-center">
                {qrPix ? <img src={qrPix} alt="QR Code Pix" className="h-44 w-44" /> : <div className="h-44 w-44 animate-pulse bg-palha" />}
                <p className="text-sm text-suave">Escaneie com o app do seu banco · {moeda(total)}</p>
              </div>
            ) : (
              <p className="bg-pergaminho p-5 text-[15px] text-suave">O boleto chega no seu e-mail e vence em dois dias úteis. Separamos as peças assim que ele compensar.</p>
            )}
          </Etapa>
        </div>

        <aside className="costurado h-fit bg-pergaminho p-8 lg:sticky lg:top-24">
          <h2 className="text-[28px]">Suas peças</h2>
          <ul className="mt-5 space-y-4">
            {carrinho.map((i) => (
              <li key={i.sku} className="flex gap-3 text-sm">
                <Foto src={i.imagemUrl ?? fotoEstudio(i.skuBase)} alt={i.imagemAlt ?? i.nome} className="aspect-[4/5] w-14 shrink-0" />
                <div className="flex-1">
                  <p className="font-display text-[17px] leading-tight">{i.nome}</p>
                  <p className="text-xs text-suave">
                    {i.cor} · {i.tamanho} · {i.quantidade} un.
                  </p>
                </div>
                <span>{moeda(i.valor * i.quantidade)}</span>
              </li>
            ))}
          </ul>
          <dl className="alinhavo mt-6 space-y-2 pt-4 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-suave">Entrega</dt>
              <dd>{frete === 0 ? "por nossa conta" : moeda(frete)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-suave">Ajustes</dt>
              <dd>por nossa conta</dd>
            </div>
            {desconto > 0 ? (
              <div className="flex justify-between">
                <dt className="text-suave">Pontos Lorenzi+ ({fmtPontos(pontosUsados)})</dt>
                <dd>− {moeda(desconto)}</dd>
              </div>
            ) : null}
          </dl>
          <div className="alinhavo mt-4 flex items-baseline justify-between pt-4">
            <span>Total</span>
            <span className="font-display text-[34px]">{moeda(total)}</span>
          </div>
          {lorenziMais ? (
            <ResgateDePontos
              saldo={lorenziMais.saldo}
              maximo={maximoDePontos}
              passo={lorenziMais.regras.multiplo_de_resgate}
              reaisA100={lorenziMais.regras.reais_a_cada_100_pontos}
              usados={pontosUsados}
              onUsar={setPontosEscolhidos}
              ganhos={pontosGanhos}
            />
          ) : null}
          {erroLojas ? <p role="alert" className="mt-6 text-sm text-perigo">{erroLojas}</p> : null}
          {erro ? <p role="alert" className="mt-6 text-sm text-perigo">{erro}</p> : null}
          <button type="submit" disabled={ocupado !== null || aguardandoLojas || Boolean(erroLojas) || semLojaParaRetirada || semEstoqueOnline} className={cn(botaoLoja(), "mt-6 w-full")}>
            {ocupado || aguardandoLojas ? "Confirmando…" : "Confirmar o pedido"}
          </button>
          <p className="mt-3 text-center text-xs text-suave">O pagamento fica registrado no pedido para acompanhamento da loja.</p>
        </aside>
      </form>
    </div>
  );
}

/** Lorenzi+ no fechamento: quanto usar do saldo (múltiplos de 100) e quanto a compra rende. */
function ResgateDePontos({
  saldo,
  maximo,
  passo,
  reaisA100,
  usados,
  onUsar,
  ganhos,
}: {
  saldo: number;
  maximo: number;
  passo: number;
  reaisA100: number;
  usados: number;
  onUsar: (pontos: number) => void;
  ganhos: number;
}) {
  return (
    <section aria-label="Pontos Lorenzi+" className="alinhavo mt-5 space-y-3 pt-4 text-[14px]">
      <p className="flex items-center gap-1.5 font-medium">
        Lorenzi
        <SinalMais className="text-[14px]" />
        <span className="ml-auto font-normal text-suave">saldo {fmtPontos(saldo)} pts</span>
      </p>
      {maximo > 0 ? (
        <label className="block">
            <span className="mb-1 block text-suave">
              Usar pontos (R$ {reaisA100} a cada 100)
            </span>
            <span className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={maximo}
                step={passo}
                value={usados}
                onChange={(e) => {
                  const n = Math.floor(Number(e.target.value) / passo) * passo;
                  onUsar(Number.isFinite(n) ? Math.max(0, Math.min(n, maximo)) : 0);
                }}
                className={cn(campoLoja, "w-32 py-2")}
              />
              <button type="button" onClick={() => onUsar(usados === maximo ? 0 : maximo)} className="text-sm underline underline-offset-4 hover:text-caramelo">
                {usados === maximo ? "Não usar" : `Usar ${fmtPontos(maximo)}`}
              </button>
            </span>
        </label>
      ) : (
        <p className="text-suave">Com {fmtPontos(passo)} pontos você já ganha R$ {reaisA100} de desconto.</p>
      )}
      <p className="text-suave">Esta compra rende {fmtPontos(ganhos)} pontos (no site, em dobro).</p>
    </section>
  );
}
