import type { Papel } from "./sessao";

/**
 * Lê o payload de um JWT só para decidir o que mostrar na tela (cargo e loja).
 * Não valida assinatura: quem valida e decide o acesso é sempre o servidor.
 */
export function decodificarClaims(token: string): Record<string, unknown> | null {
  const partes = token.split(".");
  if (partes.length !== 3 || !partes[1]) return null;
  try {
    const base64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
    const preenchido = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const bytes = Uint8Array.from(atob(preenchido), (c) => c.charCodeAt(0));
    const dados: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return dados && typeof dados === "object" && !Array.isArray(dados)
      ? (dados as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Papéis do banco (`papel` do token) e os cargos usados na interface. */
const PAPEL_DO_TOKEN: Record<string, Papel> = {
  atendente: "atendente",
  operador_estoque: "operador",
  gerente_loja: "gerente",
  admin: "administrador",
};

export function papelDoToken(papel: unknown): Papel | null {
  return typeof papel === "string" && Object.hasOwn(PAPEL_DO_TOKEN, papel)
    ? PAPEL_DO_TOKEN[papel]!
    : null;
}

export function lojaDoToken(claims: Record<string, unknown>): string | undefined {
  return typeof claims.loja_id === "string" && claims.loja_id ? claims.loja_id : undefined;
}
