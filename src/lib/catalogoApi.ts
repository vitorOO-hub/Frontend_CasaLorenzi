import { useEffect, useState } from "react";
import { usandoApi } from "@/api/config";
import { supabase } from "@/api/supabase";
import type { Produto, VariacaoProdutoCatalogo } from "./dados";

export type LinhaVariacaoCatalogo = {
  id_variacao: string | null;
  sku: string | null;
  cor: string | null;
  tamanho: string | null;
  preco_venda: string | number | null;
  ativo?: boolean | null;
};

export type LinhaProdutoCatalogo = {
  id_produto: string;
  nome: string;
  marca: string | null;
  categoria: string | null;
  descricao: string | null;
  preco_base: string | number;
  ativo: boolean | null;
  variacao_produto?: LinhaVariacaoCatalogo[] | null;
};

type EstadoCatalogo = {
  produtos: Produto[];
  carregando: boolean;
  erro: string | null;
  origem: "api" | "simulado";
};

const numero = (valor: string | number | null | undefined) => {
  const normalizado = Number(valor ?? 0);
  return Number.isFinite(normalizado) ? normalizado : 0;
};

const texto = (valor: string | null | undefined, padrao: string) => {
  const limpo = valor?.trim();
  return limpo || padrao;
};

export function produtoCatalogoDeLinha(linha: LinhaProdutoCatalogo): Produto {
  const variacoes = (linha.variacao_produto ?? [])
    .filter((variacao) => variacao.ativo !== false && variacao.sku)
    .map<VariacaoProdutoCatalogo>((variacao) => ({
      idVariacao: variacao.id_variacao ?? undefined,
      sku: variacao.sku!,
      cor: texto(variacao.cor, "Única"),
      tamanho: texto(variacao.tamanho, "Único"),
      preco: numero(variacao.preco_venda || linha.preco_base),
    }));
  const precos = variacoes.map((variacao) => variacao.preco).filter((preco) => preco > 0);
  return {
    sku: variacoes[0]?.sku ?? linha.id_produto,
    nome: linha.nome,
    categoria: texto(linha.categoria, "Catálogo"),
    preco: Math.min(...(precos.length ? precos : [numero(linha.preco_base)])),
    descricao: linha.descricao,
    saldos: [],
    movimentacoes: [],
    variacoes,
  };
}

export async function listarProdutosCatalogo(): Promise<Produto[]> {
  const { data, error } = await supabase()
    .from("produto")
    .select(
      "id_produto,nome,marca,categoria,descricao,preco_base,ativo,variacao_produto(id_variacao,sku,cor,tamanho,preco_venda)",
    )
    .eq("ativo", true)
    .order("nome", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as LinhaProdutoCatalogo[]).map(produtoCatalogoDeLinha);
}

export function useProdutosCatalogo(produtosSimulados: Produto[]): EstadoCatalogo {
  const modoApi = usandoApi();
  const [estado, setEstado] = useState<EstadoCatalogo>({
    produtos: produtosSimulados,
    carregando: modoApi,
    erro: null,
    origem: modoApi ? "api" : "simulado",
  });

  useEffect(() => {
    if (!modoApi) return;

    let ativo = true;
    listarProdutosCatalogo()
      .then((produtos) => {
        if (!ativo) return;
        if (produtos.length === 0) {
          setEstado({
            produtos: produtosSimulados,
            carregando: false,
            erro: "Nenhuma peça ativa encontrada no banco.",
            origem: "simulado",
          });
          return;
        }
        setEstado({ produtos, carregando: false, erro: null, origem: "api" });
      })
      .catch(() => {
        if (!ativo) return;
        setEstado({
          produtos: produtosSimulados,
          carregando: false,
          erro: "Não foi possível carregar o catálogo agora.",
          origem: "simulado",
        });
      });

    return () => {
      ativo = false;
    };
  }, [modoApi, produtosSimulados]);

  return modoApi ? estado : { produtos: produtosSimulados, carregando: false, erro: null, origem: "simulado" };
}
