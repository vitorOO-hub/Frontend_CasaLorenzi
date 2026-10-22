import { useEffect, useState } from "react";
import {
  buscarFicha,
  buscarOpcoesClientes,
  buscarVultoMaisDaFicha,
  ehUuid,
  listarClientes,
  type FichaCliente,
  type FiltrosClientes,
  type ListaClientes,
  type OpcoesClientes,
  type VultoMaisDaFicha,
} from "@/lib/clientesApi";
import { useConsulta, type Consulta } from "./useChamados";

/** Valor que só muda depois de `ms` sem novas alterações (para não consultar a cada tecla). */
export function useAtraso<T>(valor: T, ms = 350): T {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const relogio = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(relogio);
  }, [valor, ms]);
  return atrasado;
}

export const useListaClientes = (filtros: FiltrosClientes): Consulta<ListaClientes> =>
  useConsulta((sinal) => listarClientes(filtros, { sinal }), JSON.stringify(filtros));

/** Lojas de cadastro e categorias Lorenzi+ para os filtros da lista. */
export const useOpcoesClientes = (): Consulta<OpcoesClientes> =>
  useConsulta((sinal) => buscarOpcoesClientes({ sinal }), "clientes:opcoes");

/** Ficha do cliente. Id que não é um UUID nem chega a consultar o servidor. */
export const useFichaCliente = (id: string | undefined): Consulta<FichaCliente> =>
  useConsulta((sinal) => buscarFicha(id as string, undefined, { sinal }), `ficha:${id}`, { ativa: ehUuid(id) });

/** Pontos Lorenzi+ do cliente na ficha. */
export const useVultoMaisDaFicha = (id: string | undefined): Consulta<VultoMaisDaFicha> =>
  useConsulta((sinal) => buscarVultoMaisDaFicha(id as string, undefined, { sinal }), `vulto-mais:${id}`, { ativa: ehUuid(id) });
