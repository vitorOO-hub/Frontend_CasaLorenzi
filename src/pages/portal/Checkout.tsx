import QRCode from "qrcode";
import { Barcode, CreditCard, QrCode } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { Campo, Select, cn, inputClasses } from "@/components/ui";
import { FotoProduto } from "@/components/vitrine";
import { lojas, moeda } from "@/lib/dados";
import { useSessao } from "@/lib/sessao";
import { finalizarCompra, useEstado } from "@/lib/store";
import { freteDe } from "./Sacola";

const estados = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

type Pagamento = "cartao" | "pix" | "boleto";

const formas: { id: Pagamento; rotulo: string; icone: typeof CreditCard }[] = [
  { id: "cartao", rotulo: "Cartão de crédito", icone: CreditCard },
  { id: "pix", rotulo: "Pix", icone: QrCode },
  { id: "boleto", rotulo: "Boleto", icone: Barcode },
];

function Etapa({ numero, titulo, children }: { numero: number; titulo: string; children: ReactNode }) {
  return (
    <section className="bg-papel p-6 md:p-8">
      <h2 className="mb-6 flex items-center gap-3 text-2xl">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-dourado font-sans text-xs text-dourado">
          {numero}
        </span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

export function Checkout() {
  const { carrinho } = useEstado();
  const sessao = useSessao();
  const [entrega, setEntrega] = useState<"casa" | "loja">("casa");
  const [lojaRetirada, setLojaRetirada] = useState(lojas[0]!.id);
  const [pagamento, setPagamento] = useState<Pagamento>("cartao");
  const [parcelas, setParcelas] = useState("1");
  const [qrPix, setQrPix] = useState<string | null>(null);
  const [pedido, setPedido] = useState<string | null>(null);

  const subtotal = carrinho.reduce((s, i) => s + i.valor * i.quantidade, 0);
  const frete = entrega === "loja" ? 0 : freteDe(subtotal);
  const total = subtotal + frete;
  const codigoPix = `00020126BR.GOV.BCB.PIX.CASALORENZI520400005303986540${total.toFixed(2)}5802BR5913CASA LORENZI6009SAO PAULO6304LRZI`;

  useEffect(() => {
    if (pagamento !== "pix") return;
    let ativo = true;
    void QRCode.toDataURL(codigoPix, { margin: 1, width: 320, color: { dark: "#131c30", light: "#ffffff" } }).then(
      (url) => ativo && setQrPix(url),
    );
    return () => {
      ativo = false;
    };
  }, [pagamento, codigoPix]);

  if (pedido) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <span className="filete mx-auto mb-6" />
        <p className="rotulo !text-dourado">Compra confirmada</p>
        <h1 className="mt-3 text-5xl font-light">Obrigado!</h1>
        <p className="mt-4 text-sm text-suave">
          Seu pedido <strong className="text-tinta">{pedido}</strong> foi recebido e já está em
          separação. Você acompanha cada etapa em Minha conta.
        </p>
        <Link
          to="/conta/pedidos"
          className="mt-8 inline-block bg-marinho px-10 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white hover:bg-marinho-escuro"
        >
          Acompanhar pedido
        </Link>
      </div>
    );
  }

  if (carrinho.length === 0) return <Navigate to="/sacola" replace />;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 md:px-8">
      <h1 className="mb-10 text-center text-5xl font-light">Finalizar compra</h1>

      <form
        className="grid gap-8 lg:grid-cols-[1fr_22rem]"
        onSubmit={(e) => {
          e.preventDefault();
          if (sessao?.tipo !== "cliente") return;
          const novo = finalizarCompra(
            sessao.clienteId,
            entrega === "loja" ? lojaRetirada : lojas[0]!.id,
            frete,
          );
          if (novo) {
            setPedido(novo.id);
            window.scrollTo(0, 0);
          }
        }}
      >
        <div className="space-y-4">
          <Etapa numero={1} titulo="Entrega">
            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["casa", "Receber em casa", freteDe(subtotal) === 0 ? "Frete grátis" : `Frete ${moeda(freteDe(subtotal))}`],
                  ["loja", "Retirar na loja", "Grátis · pronto em 2 dias úteis"],
                ] as const
              ).map(([id, titulo, nota]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setEntrega(id)}
                  className={cn(
                    "border p-4 text-left transition-colors",
                    entrega === id ? "border-marinho bg-marinho-claro/40" : "border-linha hover:border-marinho/50",
                  )}
                >
                  <span className="block text-sm font-semibold">{titulo}</span>
                  <span className="text-xs text-suave">{nota}</span>
                </button>
              ))}
            </div>

            {entrega === "casa" ? (
              <div className="grid gap-4 sm:grid-cols-6">
                <Campo label="CEP" className="sm:col-span-2">
                  <input defaultValue="01422-001" required inputMode="numeric" className={inputClasses} />
                </Campo>
                <Campo label="Rua" className="sm:col-span-4">
                  <input defaultValue="Rua Bela Cintra" required className={inputClasses} />
                </Campo>
                <Campo label="Número" className="sm:col-span-2">
                  <input defaultValue="1200" required className={inputClasses} />
                </Campo>
                <Campo label="Complemento" className="sm:col-span-2">
                  <input placeholder="Apto, bloco…" className={inputClasses} />
                </Campo>
                <Campo label="Estado" className="sm:col-span-2">
                  <Select defaultValue="SP" opcoes={estados.map((e) => ({ value: e, label: e }))} />
                </Campo>
              </div>
            ) : (
              <Campo label="Loja para retirada">
                <Select
                  value={lojaRetirada}
                  onChange={(e) => setLojaRetirada(e.target.value)}
                  opcoes={lojas.map((l) => ({ value: l.id, label: `${l.nome} — ${l.cidade}` }))}
                />
              </Campo>
            )}
          </Etapa>

          <Etapa numero={2} titulo="Pagamento">
            <div className="mb-6 grid grid-cols-3 gap-3">
              {formas.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setPagamento(f.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 border px-3 py-4 text-xs font-semibold transition-colors",
                    pagamento === f.id ? "border-marinho bg-marinho-claro/40 text-marinho" : "border-linha text-suave hover:border-marinho/50",
                  )}
                >
                  <f.icone className="h-5 w-5" strokeWidth={1.5} />
                  {f.rotulo}
                </button>
              ))}
            </div>

            {pagamento === "cartao" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo label="Número do cartão" className="sm:col-span-2">
                  <input required inputMode="numeric" placeholder="0000 0000 0000 0000" className={inputClasses} />
                </Campo>
                <Campo label="Nome impresso no cartão" className="sm:col-span-2">
                  <input required placeholder="Como está no cartão" className={inputClasses} />
                </Campo>
                <Campo label="Validade">
                  <input required placeholder="MM/AA" className={inputClasses} />
                </Campo>
                <Campo label="CVV">
                  <input required inputMode="numeric" placeholder="123" className={inputClasses} />
                </Campo>
                <Campo label="Parcelamento" className="sm:col-span-2">
                  <Select
                    value={parcelas}
                    onChange={(e) => setParcelas(e.target.value)}
                    opcoes={[1, 2, 3, 6, 10].map((n) => ({
                      value: String(n),
                      label: n === 1 ? `À vista — ${moeda(total)}` : `${n}x de ${moeda(total / n)} sem juros`,
                    }))}
                  />
                </Campo>
              </div>
            ) : pagamento === "pix" ? (
              <div className="flex flex-col items-center gap-3 bg-areia/40 p-6 text-center">
                {qrPix ? (
                  <img src={qrPix} alt="QR Code Pix" className="h-44 w-44 border border-linha bg-white p-2" />
                ) : (
                  <div className="h-44 w-44 animate-pulse bg-white" />
                )}
                <p className="text-sm text-suave">Escaneie com o app do seu banco · {moeda(total)}</p>
                <p className="max-w-sm break-all font-mono text-[9px] text-suave/70">{codigoPix}</p>
              </div>
            ) : (
              <p className="bg-areia/40 p-5 text-sm text-suave">
                O boleto é gerado após a confirmação e vence em 2 dias úteis. O pedido é separado
                após a compensação.
              </p>
            )}
          </Etapa>
        </div>

        <aside className="h-fit bg-papel p-6 lg:sticky lg:top-40">
          <p className="rotulo">Seu pedido</p>
          <ul className="mt-5 space-y-4">
            {carrinho.map((i) => (
              <li key={i.sku} className="flex gap-3 text-sm">
                <FotoProduto sku={i.skuBase} alt="" className="aspect-[4/5] w-14 shrink-0" />
                <div className="flex-1">
                  <p>{i.nome}</p>
                  <p className="text-xs text-suave">
                    {i.tamanho} · {i.cor} · {i.quantidade} un.
                  </p>
                </div>
                <span>{moeda(i.valor * i.quantidade)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-6 space-y-2 border-t border-linha pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-suave">Subtotal</dt>
              <dd>{moeda(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-suave">Frete</dt>
              <dd>{frete === 0 ? "Grátis" : moeda(frete)}</dd>
            </div>
          </dl>
          <div className="mt-4 flex items-baseline justify-between border-t border-linha pt-4">
            <span className="text-sm">Total</span>
            <span className="font-display text-3xl text-marinho">{moeda(total)}</span>
          </div>
          <button
            type="submit"
            className="mt-6 w-full bg-marinho py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white hover:bg-marinho-escuro"
          >
            Confirmar pedido
          </button>
          <p className="mt-3 text-center text-[11px] text-suave">
            Pagamento simulado — nenhum dado é processado.
          </p>
        </aside>
      </form>
    </div>
  );
}
