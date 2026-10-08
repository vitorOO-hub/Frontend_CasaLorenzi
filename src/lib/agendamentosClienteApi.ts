import { api } from "@/api/http";
import { lista, numero, objeto, opcao, texto, textoOuNulo, type Opcao } from "./validacao";
import { validarDetalheChamadoCliente, type DetalheChamadoClienteApi } from "./chamadosClienteApi";

export type SlotAgendamentoClienteApi = {
  id_loja: string;
  loja: string;
  data: string;
  horario: string;
  vagas: number;
};

export type OpcoesAgendamentoClienteApi = {
  tipos: Opcao[];
  slots: SlotAgendamentoClienteApi[];
};

export type AgendamentoClienteCriar = {
  tipo: "ajuste" | "prova";
  id_loja: string;
  data: string;
  horario: string;
  nome: string;
  telefone: string;
  observacao?: string | null;
  peca_sku?: string | null;
  peca_nome?: string | null;
};

function validarSlot(dados: unknown): SlotAgendamentoClienteApi {
  const o = objeto(dados, "slot");
  return {
    id_loja: texto(o.id_loja, "id_loja"),
    loja: texto(o.loja, "loja"),
    data: texto(o.data, "data"),
    horario: texto(o.horario, "horario").slice(0, 5),
    vagas: numero(o.vagas, "vagas"),
  };
}

export function validarOpcoesAgendamento(dados: unknown): OpcoesAgendamentoClienteApi {
  const o = objeto(dados, "opcoes_agendamento");
  return {
    tipos: lista(o.tipos, "tipos").map((valor, i) => opcao(valor, `tipos[${i}]`)),
    slots: lista(o.slots, "slots").map(validarSlot),
  };
}

export const listarOpcoesAgendamentoCliente = async () =>
  validarOpcoesAgendamento(await api.get<unknown>("/cliente/agendamentos/opcoes"));

export const criarAgendamentoCliente = async (dados: AgendamentoClienteCriar): Promise<DetalheChamadoClienteApi> =>
  validarDetalheChamadoCliente(
    await api.post<unknown>("/cliente/agendamentos", {
      ...dados,
      observacao: textoOuNulo(dados.observacao ?? null, "observacao"),
      peca_sku: textoOuNulo(dados.peca_sku ?? null, "peca_sku"),
      peca_nome: textoOuNulo(dados.peca_nome ?? null, "peca_nome"),
    }),
  );
