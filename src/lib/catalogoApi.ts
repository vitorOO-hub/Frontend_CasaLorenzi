import { useEffect, useState } from "react";
import { usandoApi } from "@/api/config";
import { api } from "@/api/http";
import { supabase } from "@/api/supabase";
import type { CorProdutoCatalogo, EstoqueVariacaoCatalogo, Produto, VariacaoProdutoCatalogo } from "./dados";
import { lista, numero as validarNumero, objeto, texto } from "./validacao";

export type LinhaVariacaoCatalogo = {
  id_variacao: string | null;
  sku: string | null;
  cor: string | null;
  tamanho: string | null;
  preco_venda: string | number | null;
  ativa?: boolean | null;
};

export type LinhaProdutoCatalogo = {
  id_produto: string;
  nome: string;
  marca: string | null;
  categoria: string | null;
  descricao: string | null;
  preco_base: string | number;
  ativo: boolean | null;
  imagem_url: string | null;
  imagem_alt: string | null;
  imagem_vestida_url: string | null;
  tipo: string | null;
  tecido: string | null;
  tecelagem: string | null;
  costurado_em: string | null;
  nota: string | null;
  cores: unknown;
  variacao_produto?: LinhaVariacaoCatalogo[] | null;
};

type EstadoCatalogo = {
  produtos: Produto[];
  carregando: boolean;
  erro: string | null;
  origem: "api" | "simulado";
};

const numeroSeguro = (valor: string | number | null | undefined) => {
  const normalizado = Number(valor ?? 0);
  return Number.isFinite(normalizado) ? normalizado : 0;
};

const textoComPadrao = (valor: string | null | undefined, padrao: string) => {
  const limpo = valor?.trim();
  return limpo || padrao;
};

const textoObrigatorio = (valor: string | null | undefined) => {
  const limpo = valor?.trim();
  return limpo || null;
};

const coresCatalogo = (valor: unknown): CorProdutoCatalogo[] | null => {
  if (!Array.isArray(valor)) return null;
  const cores = valor
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const cor = item as Record<string, unknown>;
      return typeof cor.nome === "string" && typeof cor.hex === "string"
        ? { nome: cor.nome.trim(), hex: cor.hex.trim() }
        : null;
    })
    .filter((item): item is CorProdutoCatalogo => Boolean(item?.nome && item.hex));
  return cores.length ? cores : null;
};

export function produtoCatalogoDeLinha(linha: LinhaProdutoCatalogo): Produto | null {
  const imagemUrl = textoObrigatorio(linha.imagem_url);
  const imagemAlt = textoObrigatorio(linha.imagem_alt);
  const tipo = textoObrigatorio(linha.tipo);
  const tecido = textoObrigatorio(linha.tecido);
  const tecelagem = textoObrigatorio(linha.tecelagem);
  const costuradoEm = textoObrigatorio(linha.costurado_em);
  const nota = textoObrigatorio(linha.nota);
  const cores = coresCatalogo(linha.cores);
  if (!imagemUrl || !imagemAlt || !tipo || !tecido || !tecelagem || !costuradoEm || !nota || !cores) {
    return null;
  }

  const variacoes = (linha.variacao_produto ?? [])
    .filter((variacao) => variacao.ativa !== false && variacao.sku)
    .map<VariacaoProdutoCatalogo>((variacao) => ({
      idVariacao: variacao.id_variacao ?? undefined,
      sku: variacao.sku!,
      cor: textoComPadrao(variacao.cor, "Única"),
      tamanho: textoComPadrao(variacao.tamanho, "Único"),
      preco: numeroSeguro(variacao.preco_venda || linha.preco_base),
    }));
  const precos = variacoes.map((variacao) => variacao.preco).filter((preco) => preco > 0);
  if (variacoes.length === 0) return null;

  return {
    sku: variacoes[0]?.sku ?? linha.id_produto,
    nome: linha.nome,
    categoria: textoComPadrao(linha.categoria, "Catálogo"),
    preco: Math.min(...(precos.length ? precos : [numeroSeguro(linha.preco_base)])),
    descricao: linha.descricao,
    saldos: [],
    movimentacoes: [],
    variacoes,
    imagemUrl,
    imagemAlt,
    imagemVestidaUrl: textoObrigatorio(linha.imagem_vestida_url),
    tipo,
    tecido,
    tecelagem,
    costuradoEm,
    nota,
    cores,
  };
}

type EstoqueCatalogoApi = {
  id_variacao: string;
  sku: string;
  id_loja: string;
  loja: string;
  quantidade: number;
};

function validarEstoqueCatalogo(dados: unknown): EstoqueCatalogoApi[] {
  return lista(dados, "estoque").map((item) => {
    const o = objeto(item, "estoque_item");
    return {
      id_variacao: texto(o.id_variacao, "id_variacao"),
      sku: texto(o.sku, "sku"),
      id_loja: texto(o.id_loja, "id_loja"),
      loja: texto(o.loja, "loja"),
      quantidade: validarNumero(o.quantidade, "quantidade"),
    };
  });
}

const listarEstoqueCatalogo = async () =>
  validarEstoqueCatalogo(await api.get<unknown>("/cliente/catalogo/estoque"));

function aplicarEstoqueCatalogo(produtos: Produto[], linhas: EstoqueCatalogoApi[]): Produto[] {
  const porVariacao = new Map<string, EstoqueVariacaoCatalogo[]>();
  for (const linha of linhas) {
    const estoque = porVariacao.get(linha.id_variacao) ?? [];
    estoque.push({ lojaId: linha.id_loja, loja: linha.loja, quantidade: linha.quantidade });
    porVariacao.set(linha.id_variacao, estoque);
  }
  return produtos.map((produto) => ({
    ...produto,
    variacoes: (produto.variacoes ?? []).map((variacao) => ({
      ...variacao,
      estoque: variacao.idVariacao ? (porVariacao.get(variacao.idVariacao) ?? []) : [],
    })),
  }));
}

export async function listarProdutosCatalogo(): Promise<Produto[]> {
  const { data, error } = await supabase()
    .from("produto")
    .select(
      "id_produto,nome,marca,categoria,descricao,preco_base,ativo,imagem_url,imagem_alt,imagem_vestida_url,tipo,tecido,tecelagem,costurado_em,nota,cores,variacao_produto(id_variacao,sku,cor,tamanho,preco_venda,ativa)",
    )
    .eq("ativo", true)
    .not("imagem_url", "is", null)
    .order("nome", { ascending: true });
  if (error) throw error;
  const produtos = ((data ?? []) as LinhaProdutoCatalogo[]).map(produtoCatalogoDeLinha).filter((produto): produto is Produto => Boolean(produto));
  return aplicarEstoqueCatalogo(produtos, await listarEstoqueCatalogo());
}

export function useProdutosCatalogo(produtosSimulados: Produto[]): EstadoCatalogo {
  const modoApi = usandoApi();
  const [estado, setEstado] = useState<EstadoCatalogo>({
    produtos: modoApi ? [] : produtosSimulados,
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
            produtos: [],
            carregando: false,
            erro: "Nenhuma peça ativa encontrada no banco.",
            origem: "api",
          });
          return;
        }
        setEstado({ produtos, carregando: false, erro: null, origem: "api" });
      })
      .catch(() => {
        if (!ativo) return;
        setEstado({
          produtos: [],
          carregando: false,
          erro: "Não foi possível carregar o catálogo agora.",
          origem: "api",
        });
      });

    return () => {
      ativo = false;
    };
  }, [modoApi, produtosSimulados]);

  return modoApi ? estado : { produtos: produtosSimulados, carregando: false, erro: null, origem: "simulado" };
}
