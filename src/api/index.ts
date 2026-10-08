/**
 * Integração com o backend. Visão geral:
 *
 * - `config`   : modo "simulado" (padrão) ou "api", lido das variáveis VITE_*.
 * - `auth`     : login, cadastro e sessão pelo Supabase Auth; papel e loja vêm do JWT.
 * - `erros`    : ErroApi com código estável (conflito, sem_permissao…) e mensagem em pt-BR.
 * - `tipos`    : enums espelhados do banco e modelos de entrada/saída.
 */
export * as auth from "./auth";
export { config, faltandoParaApi, usandoApi } from "./config";
export { ErroApi, mensagemDeErro, type CodigoErro } from "./erros";
export { novaChaveIdempotencia } from "./http";
export * from "./tipos";
