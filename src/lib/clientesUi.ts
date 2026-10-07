import type { Tom } from "@/components/ui";
import type { SecaoClientes } from "./clientesApi";

/** Apresentação da área de clientes. Sem regra de negócio: ela mora na API. */

export const SECOES_CLIENTES: { value: SecaoClientes; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "com_aberto", label: "Com chamado em aberto" },
  { value: "meus", label: "Meus clientes" },
];

/** Status do pedido no banco: criado, aguardando_pagamento, pago, separado, entregue, cancelado. */
export function tomStatusPedido(codigo: string): Tom {
  if (codigo === "entregue") return "ok";
  if (codigo === "pago" || codigo === "separado") return "destaque";
  if (codigo === "cancelado") return "perigo";
  return "alerta";
}

export const POR_PAGINA_CLIENTES = 20;
