import { podeAcessar, telaInicial } from "./navegacao";
import type { Sessao } from "./sessao";

/**
 * Caminho do parâmetro `voltar` só se for uma rota interna do site. Endereços absolutos
 * (`https://…`, `//…`) e barras invertidas são recusados: sem isso, um link de login forjado
 * poderia mandar a pessoa para outro site logo depois de autenticar.
 */
export function voltarSeguro(voltar: string | null): string | null {
  if (!voltar || !voltar.startsWith("/") || voltar.startsWith("//") || /[\\\s]/.test(voltar)) return null;
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(voltar)) return null;
  // Voltar para o próprio login deixaria a pessoa presa na tela depois de autenticar.
  if (/^\/entrar(?:[/?#]|$)/.test(voltar)) return null;
  return voltar;
}

/**
 * Para onde a pessoa vai depois de entrar. Quem decide é o tipo da conta (token), não a tela de login:
 * - cliente: volta para a loja, na página onde estava (ou na vitrine), agora logado;
 * - equipe: vai para o painel, na tela pedida se o cargo puder abri-la, senão na tela inicial do cargo.
 */
export function destinoAposLogin(sessao: Sessao, voltar: string | null): string {
  const alvo = voltarSeguro(voltar);
  if (sessao.tipo === "interno") {
    const caminho = alvo?.split(/[?#]/)[0] ?? "";
    const noPainel = caminho === "/painel" || caminho.startsWith("/painel/");
    return alvo && noPainel && podeAcessar(sessao.papel, caminho) ? alvo : telaInicial(sessao.papel);
  }
  const noPainel = alvo === "/painel" || alvo?.startsWith("/painel/") || alvo?.startsWith("/painel?");
  return alvo && !noPainel ? alvo : "/";
}
