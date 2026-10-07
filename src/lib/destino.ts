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
  return voltar;
}

/** Para onde a pessoa vai depois de entrar: o tipo de conta (token) decide, não a tela de login. */
export function destinoAposLogin(sessao: Sessao, voltar: string | null): string {
  const alvo = voltarSeguro(voltar);
  if (sessao.tipo === "interno") {
    const caminho = alvo?.split(/[?#]/)[0] ?? "";
    const noPainel = caminho === "/painel" || caminho.startsWith("/painel/");
    return alvo && noPainel && podeAcessar(sessao.papel, caminho) ? alvo : telaInicial(sessao.papel);
  }
  const noPainel = alvo === "/painel" || alvo?.startsWith("/painel/") || alvo?.startsWith("/painel?");
  return alvo && !noPainel ? alvo : "/conta/pedidos";
}
