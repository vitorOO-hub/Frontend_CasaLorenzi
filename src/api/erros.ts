/**
 * Erros da API traduzidos para a interface. O backend responde 401, 403, 404, 409 e 422
 * com mensagens em português (seção 6 do briefing); aqui cada status vira um código
 * estável que as telas podem tratar (ex.: 409 = "outro atendente já assumiu").
 */

export type CodigoErro =
  | "nao_autenticado" // 401: token ausente, inválido ou expirado
  | "sem_permissao" // 403: papel ou loja sem acesso
  | "nao_encontrado" // 404
  | "conflito" // 409: estado não permite (ajuste já decidido, chamado já assumido, unicidade)
  | "validacao" // 422: corpo recusado pelo Pydantic
  | "limite" // 429: rate limit
  | "servidor" // 5xx
  | "rede" // sem resposta (offline, CORS, timeout)
  | "configuracao"; // front sem as variáveis do modo "api"

export type ErroCampo = { campo: string; mensagem: string };

const mensagemPadrao: Record<CodigoErro, string> = {
  nao_autenticado: "Sua sessão expirou. Entre de novo para continuar.",
  sem_permissao: "Seu perfil não tem permissão para esta ação.",
  nao_encontrado: "Não encontramos este registro.",
  conflito: "Este registro mudou enquanto você olhava. Atualize a página e tente de novo.",
  validacao: "Alguns campos não foram aceitos. Confira e tente de novo.",
  limite: "Muitas tentativas seguidas. Aguarde um minuto e tente de novo.",
  servidor: "Algo deu errado do nosso lado. Tente de novo em instantes.",
  rede: "Não foi possível falar com o servidor. Confira sua conexão.",
  configuracao: "O site não está configurado para falar com o servidor.",
};

export class ErroApi extends Error {
  readonly codigo: CodigoErro;
  readonly status: number;
  readonly campos: ErroCampo[];

  constructor(codigo: CodigoErro, mensagem?: string, status = 0, campos: ErroCampo[] = []) {
    super(mensagem || mensagemPadrao[codigo]);
    this.name = "ErroApi";
    this.codigo = codigo;
    this.status = status;
    this.campos = campos;
  }
}

export function codigoDoStatus(status: number): CodigoErro {
  if (status === 401) return "nao_autenticado";
  if (status === 403) return "sem_permissao";
  if (status === 404) return "nao_encontrado";
  if (status === 409) return "conflito";
  if (status === 422) return "validacao";
  if (status === 429) return "limite";
  return "servidor";
}

type DetalheFastApi = string | { loc?: (string | number)[]; msg?: string }[] | undefined;

/**
 * Monta o ErroApi a partir do corpo de erro do FastAPI: `{ detail: "texto" }` nos erros de
 * domínio ou `{ detail: [{ loc, msg }] }` na validação do Pydantic. Erro 5xx nunca mostra o
 * texto do servidor (a mensagem fica genérica, como pede o briefing).
 */
export function erroDaResposta(status: number, corpo: unknown): ErroApi {
  const codigo = codigoDoStatus(status);
  const detalhe = (corpo as { detail?: DetalheFastApi } | null)?.detail;
  if (codigo === "servidor") return new ErroApi(codigo, undefined, status);
  if (Array.isArray(detalhe)) {
    const campos = detalhe.map((d) => ({
      campo: (d.loc ?? []).filter((p) => p !== "body").join("."),
      mensagem: d.msg ?? "valor inválido",
    }));
    return new ErroApi(codigo, undefined, status, campos);
  }
  return new ErroApi(codigo, typeof detalhe === "string" ? detalhe : undefined, status);
}

/** Mensagem pronta para mostrar ao usuário, qualquer que seja o erro. */
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ErroApi) return erro.message;
  return mensagemPadrao.servidor;
}
