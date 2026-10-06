import QRCode from "qrcode";
import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { cn } from "@/components/ui";
import { Foto, botaoLoja } from "@/components/vitrine";
import { lojas, moeda } from "@/lib/dados";
import { casas, fotoEstudio, fotoVestida } from "@/lib/loja";
import { useSessao } from "@/lib/sessao";
import { finalizarCompra, useEstado } from "@/lib/store";
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
    void QRCode.toDataURL(codigoPix, { margin: 1, width: 320, color: { dark: "#1a1f2b", light: "#fbf8f2" } }).then(
      (url) => ativo && setQrPix(url),
    );
    return () => {
      ativo = false;
    };
  }, [pagamento, codigoPix]);

  if (pedido) {
    const casa = entrega === "loja" ? lojas.find((l) => l.id === lojaRetirada) : null;
    return (
      <div className="mx-auto max-w-xl px-5 py-20 text-center">
        <p className="text-[15px] text-caramelo">Pedido {pedido}</p>
        <h1 className="mt-2 text-[56px] leading-none">Obrigado.</h1>
        <p className="mt-5 font-display text-xl leading-normal">
          {casa
            ? `Suas peças ficam prontas em dois dias úteis na casa ${casa.nome}. ${casas[casa.id]?.alfaiate.split(",")[0] ?? "O alfaiate"} faz o ajuste na hora da retirada.`
            : "Suas peças já estão sendo separadas no ateliê. Mandamos o código de rastreio assim que saírem."}
        </p>
        <p className="mt-6 font-mao text-[14px] leading-relaxed text-caramelo">— com carinho, Casa Lorenzi</p>
        <Link to="/conta/pedidos" className={cn(botaoLoja(), "mt-10")}>
          Acompanhar o pedido
        </Link>
      </div>
    );
  }

  if (carrinho.length === 0) return <Navigate to="/sacola" replace />;

  return (
    <div className="mx-auto max-w-[1180px] px-5 pt-10 md:px-12">
      <h1 className="text-[56px] leading-none md:text-[64px]">Fechar o pedido</h1>

      <form
        className="mt-6 grid gap-12 lg:grid-cols-[1fr_24rem]"
        onSubmit={(e) => {
          e.preventDefault();
          if (sessao?.tipo !== "cliente") return;
          const novo = finalizarCompra(sessao.clienteId, entrega === "loja" ? lojaRetirada : lojas[0]!.id, frete);
          if (novo) {
            setPedido(novo.id);
            window.scrollTo(0, 0);
          }
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
            {entrega === "casa" ? (
              <div className="grid gap-4 sm:grid-cols-6">
                <CampoLoja rotulo="CEP" className="sm:col-span-2">
                  <input defaultValue="01422-001" required inputMode="numeric" className={campoLoja} />
                </CampoLoja>
                <CampoLoja rotulo="Rua" className="sm:col-span-4">
                  <input defaultValue="Rua Bela Cintra" required className={campoLoja} />
                </CampoLoja>
                <CampoLoja rotulo="Número" className="sm:col-span-2">
                  <input defaultValue="1200" required className={campoLoja} />
                </CampoLoja>
                <CampoLoja rotulo="Complemento" className="sm:col-span-2">
                  <input placeholder="Apto, bloco…" className={campoLoja} />
                </CampoLoja>
                <CampoLoja rotulo="Estado" className="sm:col-span-2">
                  <select defaultValue="SP" className={campoLoja}>
                    {estados.map((e) => (
                      <option key={e}>{e}</option>
                    ))}
                  </select>
                </CampoLoja>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {lojas.map((l) => (
                  <Opcao key={l.id} ativa={lojaRetirada === l.id} onClick={() => setLojaRetirada(l.id)} titulo={l.nome} nota={casas[l.id]?.provas ?? l.cidade} />
                ))}
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

        <aside className="costurado h-fit bg-pergaminho p-8 lg:sticky lg:top-8">
          <h2 className="text-[28px]">Suas peças</h2>
          <ul className="mt-5 space-y-4">
            {carrinho.map((i) => (
              <li key={i.sku} className="flex gap-3 text-sm">
                <Foto src={fotoVestida(i.skuBase, 200) ?? fotoEstudio(i.skuBase)} className="aspect-[3/4] w-14 shrink-0" />
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
          </dl>
          <div className="alinhavo mt-4 flex items-baseline justify-between pt-4">
            <span>Total</span>
            <span className="font-display text-[34px]">{moeda(total)}</span>
          </div>
          <button type="submit" className={cn(botaoLoja(), "mt-6 w-full")}>
            Confirmar o pedido
          </button>
          <p className="mt-3 text-center text-xs text-suave">Protótipo: nenhum pagamento é processado.</p>
        </aside>
      </form>
    </div>
  );
}
