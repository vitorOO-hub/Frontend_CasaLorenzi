/**
 * Integração com o backend. Visão geral:
 *
 * - `config`   : modo "simulado" (padrão) ou "api", lido das variáveis VITE_*.
 * - `auth`     : login, cadastro e sessão pelo Supabase Auth; papel e loja vêm do JWT.
 * - `backend`  : ações sensíveis no FastAPI (/api/v1), uma função por rota da seção 6.
 * - `direto`   : leituras e escritas simples direto no Supabase, protegidas por RLS.
 * - `erros`    : ErroApi com código estável (conflito, sem_permissao…) e mensagem em pt-BR.
 * - `tipos`    : enums espelhados do banco e modelos de entrada/saída.
 */
export * as auth from "./auth";
export * as backend from "./backend";
export { config, faltandoParaApi, usandoApi } from "./config";
export * as direto from "./direto";
export { ErroApi, mensagemDeErro, type CodigoErro } from "./erros";
export { novaChaveIdempotencia } from "./http";
export * from "./tipos";
