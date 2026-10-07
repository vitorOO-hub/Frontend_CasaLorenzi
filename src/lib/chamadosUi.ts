import type { Tom } from "@/components/ui";
import type { Situacao } from "./chamadosApi";

/** Apresentação dos chamados: cores, rótulos e datas. Sem regra de negócio: ela mora na API. */

const FINAIS = ["resolvido", "encerrado", "cancelado"];

export const chamadoFinalizado = (statusCodigo: string) => FINAIS.includes(statusCodigo);

export const prioridadeUrgente = (prioridadeCodigo: string) => prioridadeCodigo === "alta" || prioridadeCodigo === "urgente";

/** O banco tem 4 prioridades; "urgente" e "alta" pedem o mesmo alerta visual. */
export function tomPrioridade(codigo: string): Tom {
  if (prioridadeUrgente(codigo)) return "perigo";
  return codigo === "media" ? "alerta" : "neutro";
}

/** O banco tem 6 status; a tela agrupa em "sem resposta", "em andamento" e "resolvido". */
export function tomStatus(codigo: string): Tom {
  if (codigo === "aberto") return "perigo";
  if (codigo === "em_andamento" || codigo === "aguardando_cliente") return "alerta";
  if (codigo === "resolvido" || codigo === "encerrado") return "ok";
  return "neutro";
}

export const SITUACOES: { value: Situacao; label: string }[] = [
  { value: "abertos", label: "Em aberto" },
  { value: "aberto", label: "Sem resposta" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "resolvido", label: "Resolvidos" },
  { value: "todos", label: "Todos" },
];

export const PRIORIDADES_FILTRO = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Média" },
  { value: "baixa", label: "Baixa" },
];

export const dataBRdoIso = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export const dataHoraBRdoIso = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const moedaBR = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
