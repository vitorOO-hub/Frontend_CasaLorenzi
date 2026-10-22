import {
  listarClientesCadastrados,
  listarVendas,
  obterVenda,
  opcoesDeVenda,
  pecasDaLoja,
  type DetalheVenda,
  type FiltrosVendas,
  type ListaClientes,
  type ListaVendas,
  type OpcoesVenda,
  type PecaNoEstoque,
} from "@/lib/vendasApi";
import { useConsulta, type Consulta } from "./useChamados";

export const useListaVendas = (filtros: FiltrosVendas, recarregarEm = 0): Consulta<ListaVendas> =>
  useConsulta((sinal) => listarVendas(filtros, { sinal }), `vendas:${JSON.stringify(filtros)}:${recarregarEm}`);

export const useDetalheVenda = (id: string | null): Consulta<DetalheVenda> =>
  useConsulta((sinal) => obterVenda(id as string, { sinal }), `venda:${id}`, { ativa: id !== null });

export const useClientesCadastrados = (filtros: FiltrosVendas): Consulta<ListaClientes> =>
  useConsulta((sinal) => listarClientesCadastrados(filtros, { sinal }), `clientes-venda:${JSON.stringify(filtros)}`);

export const useOpcoesDeVenda = (ativa: boolean): Consulta<OpcoesVenda> =>
  useConsulta((sinal) => opcoesDeVenda({ sinal }), "opcoes-venda", { ativa });

export const usePecasDaLoja = (termo: string, ativa: boolean): Consulta<PecaNoEstoque[]> =>
  useConsulta((sinal) => pecasDaLoja(termo, { sinal }), `pecas-loja:${termo}`, { ativa });
