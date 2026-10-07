import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usandoApi } from "@/api/config";
import { mensagemDeErro } from "@/api/erros";
import { Foto } from "@/components/vitrine";
import { dataBR, moeda, nomeLoja, type StatusPedido } from "@/lib/dados";
import { listarPedidosCliente, type PedidoClienteApi } from "@/lib/comprasClienteApi";
import { fotoEstudio } from "@/lib/loja";
import { useClienteId, useSessao } from "@/lib/sessao";
import { useEstado } from "@/lib/store";

const etapas: StatusPedido[] = ["Separação", "Em transporte", "Entregue"];
const frase: Record<StatusPedido, string> = {
  Separação: "Estamos separando e passando as peças no ateliê.",
  "Em transporte": "As peças saíram do ateliê e estão a caminho.",
  Entregue: "Entregue. Se algo não vestir bem, a barra e as mangas a gente ajusta.",
  Cancelado: "Pedido cancelado — o estorno aparece em até duas faturas.",
};

function Progresso({ status }: { status: StatusPedido }) {
  if (status === "Cancelado") return null;
  const atual = etapas.indexOf(status);
  return (
    <ol className="mt-5 grid grid-cols-3 gap-2 text-xs">
      {etapas.map((e, i) => (
        <li key={e}>
          <span className={`mb-2 block border-t-[1.5px] ${i <= atual ? "border-caramelo" : "border-dashed border-linha"}`} />
          <span className={i <= atual ? "text-tinta" : "text-suave/60"}>{e}</span>
        </li>
      ))}
    </ol>
  );
}

function statusPedido(codigo: string): StatusPedido {
  if (codigo === "entregue") return "Entregue";
  if (codigo === "separado") return "Em transporte";
  if (codigo === "cancelado") return "Cancelado";
  return "Separação";
}

function pedidoApiParaTela(pedido: PedidoClienteApi) {
  return {
    id: pedido.numero_pedido,
    idPedido: pedido.id_pedido,
    data: pedido.criado_em.slice(0, 10),
    valor: Number(pedido.valor_total),
    loja: pedido.loja,
    status: statusPedido(pedido.status_codigo),
    itens: pedido.itens.map((item) => ({
      sku: item.sku,
      nome: item.produto,
      quantidade: item.quantidade,
      valor: Number(item.preco_unitario),
    })),
  };
}

export function MeusPedidos() {
  const { pedidos } = useEstado();
  const sessao = useSessao();
  const modoApi = usandoApi();
  const clienteId = useClienteId();
  const [pedidosApi, setPedidosApi] = useState<PedidoClienteApi[] | null>(null);
  const [erroApi, setErroApi] = useState<string | null>(null);
  const meus = useMemo(() => {
    if (pedidosApi) return pedidosApi.map(pedidoApiParaTela);
    return pedidos
      .filter((p) => p.clienteId === clienteId)
      .map((p) => ({
        id: p.id,
        idPedido: p.id,
        data: p.data,
        valor: p.valor,
        loja: nomeLoja(p.lojaId),
        status: p.status,
        itens: p.itens,
      }));
  }, [clienteId, pedidos, pedidosApi]);

  useEffect(() => {
    if (!modoApi || sessao?.tipo !== "cliente") return;
    let ativo = true;
    listarPedidosCliente()
      .then((lista) => {
        if (ativo) setPedidosApi(lista);
      })
      .catch((erro) => {
        if (ativo) setErroApi(mensagemDeErro(erro));
      });
    return () => {
      ativo = false;
    };
  }, [modoApi, sessao?.tipo]);

  if (modoApi && pedidosApi === null && !erroApi) {
    return <p className="font-display text-2xl text-suave">Carregando seus pedidos...</p>;
  }

  if (erroApi) {
    return <p role="alert" className="font-display text-2xl text-perigo">{erroApi}</p>;
  }

  if (meus.length === 0)
    return (
      <p className="font-display text-2xl text-suave">
        Você ainda não fez pedidos.{" "}
        <Link to="/loja" className="link-tracejado text-tinta">
          Veja a Edição 64
        </Link>
        .
      </p>
    );

  return (
    <div className="space-y-12">
      {meus.map((p) => (
        <article key={p.id} className="alinhavo pt-8 first:border-t-0 first:pt-0">
          <header className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 className="text-[28px]">Pedido {p.id}</h2>
              <p className="text-sm text-suave">
                {dataBR(p.data)} · {p.loja}
              </p>
            </div>
            <span className="font-display text-[28px]">{moeda(p.valor)}</span>
          </header>
          <p className="mt-3 font-display text-lg">{frase[p.status]}</p>
          <Progresso status={p.status} />
          <ul className="mt-6 flex flex-wrap gap-6">
            {p.itens.map((i) => (
              <li key={i.sku} className="flex items-center gap-3 text-sm">
                <Foto src={fotoEstudio(i.sku)} className="aspect-[4/5] w-14" />
                <span>
                  <span className="font-display text-[17px]">{i.nome}</span>
                  <span className="block text-xs text-suave">
                    {i.quantidade} × {moeda(i.valor)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <Link to={`/conta/atendimento/novo?pedido=${p.idPedido}`} className="link-tracejado mt-6 inline-block text-sm">
            Precisa de ajuste ou troca? Fale com a casa
          </Link>
        </article>
      ))}
    </div>
  );
}
