import { useState } from "react";
import { lojas, nomeLoja } from "@/lib/dados";
import { podeAprovar, useLojaEscopo, useNomeUsuario, usePapel } from "@/lib/sessao";
import {
  abrirReposicao,
  registrarMovimento,
  solicitarAjuste,
  solicitarTransferencia,
  useEstado,
} from "@/lib/store";
import { Botao, Campo, Modal, Segmentado, Select, inputClasses } from "./ui";

type PropsModal = { aberto: boolean; onFechar: () => void; skuFixo?: string };

function usarProdutoSelecionado(skuFixo?: string) {
  const { produtos } = useEstado();
  const [sku, setSku] = useState(skuFixo ?? produtos[0]?.sku ?? "");
  const campo = skuFixo ? null : (
    <Campo label="Peça">
      <Select
        value={sku}
        onChange={(e) => setSku(e.target.value)}
        opcoes={produtos.map((p) => ({ value: p.sku, label: `${p.sku} · ${p.nome}` }))}
      />
    </Campo>
  );
  return { sku: skuFixo ?? sku, produto: produtos.find((p) => p.sku === (skuFixo ?? sku)), campo };
}

/** Loja onde a operação acontece: fixa para quem tem unidade, escolhível para o admin. */
function usarLoja(titulo = "Loja") {
  const escopo = useLojaEscopo();
  const [lojaId, setLojaId] = useState(escopo ?? lojas[0]!.id);
  const campo = escopo ? (
    <Campo label={titulo}>
      <input value={nomeLoja(escopo)} readOnly className={inputClasses} />
    </Campo>
  ) : (
    <Campo label={titulo}>
      <Select
        value={lojaId}
        onChange={(e) => setLojaId(e.target.value)}
        opcoes={lojas.map((l) => ({ value: l.id, label: l.nome }))}
      />
    </Campo>
  );
  return { lojaId: escopo ?? lojaId, campo };
}

function Rodape({ onFechar, enviar }: { onFechar: () => void; enviar: string }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Botao variante="secundario" onClick={onFechar}>
        Cancelar
      </Botao>
      <Botao type="submit">{enviar}</Botao>
    </div>
  );
}

const motivos = {
  Entrada: ["Recebimento de fornecedor", "Devolução de cliente"],
  Saída: ["Venda em loja", "Avaria", "Peça para ajuste no ateliê"],
};

export function ModalMovimento({ aberto, onFechar, skuFixo }: PropsModal) {
  const responsavel = useNomeUsuario();
  const { sku, produto, campo: campoPeca } = usarProdutoSelecionado(skuFixo);
  const { lojaId, campo: campoLoja } = usarLoja();
  const [tipo, setTipo] = useState<"Entrada" | "Saída">("Entrada");
  const [quantidade, setQuantidade] = useState(1);
  const [motivo, setMotivo] = useState(motivos.Entrada[0]!);

  const atual = produto?.saldos.find((s) => s.lojaId === lojaId)?.quantidade ?? 0;
  const novo = Math.max(0, atual + (tipo === "Saída" ? -quantidade : quantidade));

  return (
    <Modal aberto={aberto} titulo="Registrar entrada ou saída" onFechar={onFechar}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (quantidade <= 0) return;
          registrarMovimento(sku, lojaId, tipo === "Saída" ? -quantidade : quantidade, tipo, responsavel, motivo);
          onFechar();
        }}
      >
        <Segmentado
          valor={tipo}
          onChange={(t) => {
            setTipo(t);
            setMotivo(motivos[t][0]!);
          }}
          opcoes={[
            { value: "Entrada", label: "Entrada" },
            { value: "Saída", label: "Saída" },
          ]}
        />
        {campoPeca}
        {campoLoja}
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Quantidade">
            <input
              type="number"
              min={1}
              value={quantidade}
              onChange={(e) => setQuantidade(Math.abs(Number(e.target.value)))}
              className={inputClasses}
            />
          </Campo>
          <Campo label="Motivo">
            <Select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              opcoes={motivos[tipo].map((m) => ({ value: m, label: m }))}
            />
          </Campo>
        </div>
        <p className="rounded-sm bg-areia/60 px-4 py-3 text-sm">
          Saldo em {nomeLoja(lojaId)}: <strong>{atual}</strong> → <strong className="text-marinho">{novo}</strong>
        </p>
        <Rodape onFechar={onFechar} enviar="Registrar" />
      </form>
    </Modal>
  );
}

export function ModalAjuste({ aberto, onFechar, skuFixo }: PropsModal) {
  const solicitante = useNomeUsuario();
  const papel = usePapel();
  const { sku, produto, campo: campoPeca } = usarProdutoSelecionado(skuFixo);
  const { lojaId, campo: campoLoja } = usarLoja();
  const atual = produto?.saldos.find((s) => s.lojaId === lojaId)?.quantidade ?? 0;
  const [contado, setContado] = useState<number | null>(null);
  const [motivo, setMotivo] = useState("");
  const [enviado, setEnviado] = useState(false);
  const proposta = contado ?? atual;
  const diferenca = proposta - atual;

  function fechar() {
    setEnviado(false);
    setContado(null);
    setMotivo("");
    onFechar();
  }

  return (
    <Modal aberto={aberto} titulo="Solicitar ajuste de inventário" onFechar={fechar}>
      {enviado ? (
        <div className="space-y-5">
          <p className="text-sm leading-relaxed text-suave">
            Solicitação enviada com status <strong className="text-tinta">pendente</strong>. O saldo
            só muda depois da aprovação{" "}
            {podeAprovar(papel) ? "na aba Aprovações" : "do gerente da unidade"}.
          </p>
          <div className="flex justify-end">
            <Botao onClick={fechar}>Fechar</Botao>
          </div>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!diferenca || !motivo.trim()) return;
            solicitarAjuste(sku, lojaId, diferenca, motivo.trim(), solicitante);
            setEnviado(true);
          }}
        >
          {campoPeca}
          {campoLoja}
          <Campo label="Quantidade contada" ajuda={`Saldo no sistema: ${atual} · diferença: ${diferenca > 0 ? "+" : ""}${diferenca}`}>
            <input
              type="number"
              min={0}
              value={proposta}
              onChange={(e) => setContado(Number(e.target.value))}
              className={inputClasses}
            />
          </Campo>
          <Campo label="Motivo">
            <textarea
              required
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: peça avariada, divergência na contagem…"
              className={inputClasses}
            />
          </Campo>
          <Rodape onFechar={fechar} enviar="Enviar para aprovação" />
        </form>
      )}
    </Modal>
  );
}

export function ModalTransferencia({ aberto, onFechar, skuFixo }: PropsModal) {
  const solicitante = useNomeUsuario();
  const escopo = useLojaEscopo();
  const { sku, produto, campo: campoPeca } = usarProdutoSelecionado(skuFixo);
  // Com unidade própria, o pedido é sempre "trazer peças de outra loja para a minha".
  const destinoFixo = escopo;
  const [destino, setDestino] = useState(escopo ?? lojas[0]!.id);
  const origens = lojas.filter((l) => l.id !== destino);
  const [origem, setOrigem] = useState(origens[0]!.id);
  const [quantidade, setQuantidade] = useState(1);
  const origemValida = origem !== destino ? origem : origens[0]!.id;
  const saldoOrigem = produto?.saldos.find((s) => s.lojaId === origemValida)?.quantidade ?? 0;

  return (
    <Modal aberto={aberto} titulo="Solicitar transferência" onFechar={onFechar}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          solicitarTransferencia(sku, origemValida, destino, quantidade, solicitante);
          onFechar();
        }}
      >
        {campoPeca}
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Trazer de" ajuda={`${saldoOrigem} disponíveis`}>
            <Select
              value={origemValida}
              onChange={(e) => setOrigem(e.target.value)}
              opcoes={origens.map((l) => ({ value: l.id, label: l.nome }))}
            />
          </Campo>
          {destinoFixo ? (
            <Campo label="Para">
              <input value={nomeLoja(destinoFixo)} readOnly className={inputClasses} />
            </Campo>
          ) : (
            <Campo label="Para">
              <Select
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                opcoes={lojas.map((l) => ({ value: l.id, label: l.nome }))}
              />
            </Campo>
          )}
        </div>
        <Campo label="Quantidade">
          <input
            type="number"
            min={1}
            max={saldoOrigem || undefined}
            value={quantidade}
            onChange={(e) => setQuantidade(Math.max(1, Number(e.target.value)))}
            className={inputClasses}
          />
        </Campo>
        <p className="text-xs leading-relaxed text-suave">
          A loja de origem aceita o envio e, quando as peças chegarem, a sua loja confirma o
          recebimento. Acompanhe tudo na aba Transferências.
        </p>
        <Rodape onFechar={onFechar} enviar="Solicitar" />
      </form>
    </Modal>
  );
}

export function ModalReposicao({ aberto, onFechar }: PropsModal) {
  const solicitante = useNomeUsuario();
  const { sku, campo: campoPeca } = usarProdutoSelecionado();
  const { lojaId, campo: campoLoja } = usarLoja("Loja que precisa da peça");
  const [destinatario, setDestinatario] = useState("");
  const [quantidade, setQuantidade] = useState(2);

  return (
    <Modal aberto={aberto} titulo="Pedir reposição à rede" onFechar={onFechar}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          abrirReposicao(sku, lojaId, destinatario || null, quantidade, solicitante);
          onFechar();
        }}
      >
        {campoPeca}
        {campoLoja}
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Pedir para">
            <Select
              value={destinatario}
              onChange={(e) => setDestinatario(e.target.value)}
              opcoes={[
                { value: "", label: "Toda a rede" },
                ...lojas.filter((l) => l.id !== lojaId).map((l) => ({ value: l.id, label: l.nome })),
              ]}
            />
          </Campo>
          <Campo label="Quantidade">
            <input
              type="number"
              min={1}
              value={quantidade}
              onChange={(e) => setQuantidade(Math.max(1, Number(e.target.value)))}
              className={inputClasses}
            />
          </Campo>
        </div>
        <p className="text-xs leading-relaxed text-suave">
          Quando uma loja aceitar, a transferência é criada automaticamente.
        </p>
        <Rodape onFechar={onFechar} enviar="Abrir pedido" />
      </form>
    </Modal>
  );
}
