import { trechosDe, type Trecho } from "./assistenteVendedorApi";

export type BlocoResposta =
  | { tipo: "paragrafo" | "item"; trechos: Trecho[] }
  | { tipo: "tabela"; cabecalho: string[]; linhas: string[][] };

const CONSULTAS: Record<string, string> = {
  consultar_vendas: "Vendas",
  consultar_estoque: "Estoque",
  consultar_movimentacoes_estoque: "Movimentações de estoque",
  consultar_ajustes_estoque: "Ajustes de estoque",
  consultar_transferencias_estoque: "Transferências",
  consultar_estoque_minimo: "Estoque mínimo",
  consultar_reposicao: "Reposição",
  consultar_estoque_parado: "Estoque parado",
  consultar_lojas: "Lojas",
  consultar_pendencias: "Pendências",
  consultar_chamados: "Chamados",
  consultar_mensagens_chamado: "Mensagens do chamado",
  consultar_pontos_a_vencer: "Pontos a vencer",
  consultar_equipe: "Equipe",
  consultar_catalogo: "Catálogo",
  buscar_cliente: "Cliente",
  detalhar_cliente: "Detalhes do cliente",
  consultar_auditoria: "Auditoria",
  consultar_integracoes: "Integrações",
  consultar_vendas_pendentes: "Vendas pendentes",
};

function celulasDaLinha(linha: string): string[] {
  return linha
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((celula) => celula.trim());
}

function separadorDeTabela(linha: string): boolean {
  const celulas = celulasDaLinha(linha);
  return celulas.length > 1 && celulas.every((celula) => /^:?-{3,}:?$/.test(celula));
}

function consultaLegivel(celula: string): string {
  const codigo = celula.match(/^`([^`]+)`$/)?.[1];
  if (!codigo) return celula;
  return CONSULTAS[codigo] ?? codigo.replace(/^(?:consultar|buscar|detalhar)_/, "").replaceAll("_", " ");
}

function blocoDeTexto(linha: string): BlocoResposta {
  const item = linha.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
  const conteudo = (item ? item[1]! : linha).replace(/^#+\s+/, "");
  return { tipo: item ? "item" : "paragrafo", trechos: trechosDe(conteudo) };
}

/** Converte tabelas Markdown em blocos seguros e fáceis de ler nos assistentes. */
export function blocosDaResposta(resposta: string): BlocoResposta[] {
  const linhas = resposta.split("\n").map((linha) => linha.trim());
  const blocos: BlocoResposta[] = [];

  for (let i = 0; i < linhas.length; i += 1) {
    const linha = linhas[i]!;
    if (!linha || /^#+\s*$/.test(linha)) continue;

    if (linha.includes("|") && linhas[i + 1] && separadorDeTabela(linhas[i + 1]!)) {
      const cabecalho = celulasDaLinha(linha);
      const tabela: string[][] = [];
      i += 2;

      while (i < linhas.length && linhas[i]!.includes("|")) {
        const celulas = celulasDaLinha(linhas[i]!);
        if (celulas.length === cabecalho.length) tabela.push(celulas.map(consultaLegivel));
        i += 1;
      }
      i -= 1;
      blocos.push({ tipo: "tabela", cabecalho, linhas: tabela });
      continue;
    }

    blocos.push(blocoDeTexto(linha));
  }

  return blocos;
}
