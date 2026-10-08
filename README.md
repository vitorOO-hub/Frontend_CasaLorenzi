# Casa Lorenzi — Frontend

Loja online e painel interno da **Casa Lorenzi**, rede de moda com três lojas (Ibirapuera/SP,
Barra/RJ e Savassi/BH). É uma SPA em React que conversa com a API FastAPI e com o Supabase.

| | |
|---|---|
| **Site em produção** | https://projetocasalorenzi.vercel.app |
| **API** | repositório [Backend_CasaLorenzi](https://github.com/vitorOO-hub/Backend_CasaLorenzi) (produção: https://backend-casalorenzi.onrender.com) |
| **Branches** | `develop` recebe todo trabalho novo; `main` é a versão publicada |

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Requisitos](#2-requisitos)
3. [Como rodar](#3-como-rodar)
4. [Variáveis de ambiente](#4-variáveis-de-ambiente)
5. [Scripts](#5-scripts)
6. [Estrutura do projeto](#6-estrutura-do-projeto)
7. [Telas e permissões](#7-telas-e-permissões)
8. [Integração com a API](#8-integração-com-a-api)
9. [Segurança](#9-segurança)
10. [Testes e qualidade](#10-testes-e-qualidade)
11. [Deploy](#11-deploy)
12. [Como contribuir](#12-como-contribuir)
13. [Problemas comuns](#13-problemas-comuns)

---

## 1. Visão geral

- **Loja do cliente** (`/`, `/loja`, `/sacola`, `/conta/...`): vitrine, carrinho, checkout, pedidos, chamados de atendimento e agendamentos.
- **Painel interno** (`/painel/...`): início por cargo, estoque, atendimento e gestão, com menus e telas que mudam conforme o cargo.
- **Um único login** em `/entrar` para clientes e equipe. O tipo de conta vem do token e decide o destino: o cliente volta à loja, a equipe vai ao painel.

**Stack:** React 19 · TypeScript · Vite · React Router 7 · Tailwind CSS 4 · Supabase JS (Auth, Realtime, Storage) · Vitest · oxlint.

## 2. Requisitos

- **Node.js 20.19 ou superior** (o projeto é desenvolvido com Node 24) e npm
- A API rodando (local ou a de produção) e um projeto Supabase, para o modo `api`

## 3. Como rodar

```bash
npm install                       # instala as dependências
cp .env.example .env.local        # Windows: copy .env.example .env.local
# preencha o .env.local (seção 4)
npm run dev                       # servidor de desenvolvimento
```

O site abre em **http://localhost:5173**. Use `localhost`: em algumas máquinas o Vite escuta só em IPv6 e
`127.0.0.1` não responde.

Para usar a API **local**, suba o backend (instruções no README dele), que por padrão libera o CORS para
`http://localhost:5173`, e aponte `VITE_API_URL=http://localhost:8000`.

Sem as variáveis, o app abre no **modo simulado** (dados de exemplo em memória, os mesmos para qualquer
pessoa), só para demonstração.

## 4. Variáveis de ambiente

Modelo em [`.env.example`](.env.example); o `.env.local` é ignorado pelo Git. **Toda variável `VITE_*` é
pública**: ela é gravada no JavaScript que vai para o navegador. Nunca coloque senha, *service role key* ou
qualquer segredo aqui.

| Variável | Obrigatória | Padrão | Para quê |
|---|---|---|---|
| `VITE_API_URL` | sim (modo `api`) | — | URL da API, **sem barra no fim**. As rotas ficam em `/api/v1` |
| `VITE_SUPABASE_URL` | sim (modo `api`) | — | `https://<projeto>.supabase.co` (Supabase → Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | sim (modo `api`) | — | Chave **pública** (anon) do Supabase |
| `VITE_FONTE_DADOS` | não | `api` se as três acima existem | `api` ou `simulado` |
| `VITE_SUPABASE_BUCKET_ANEXOS` | não | `chamado-anexos` | Bucket do Storage dos anexos de chamado |
| `VITE_API_TIMEOUT_MS` | não | `15000` | Tempo máximo de uma chamada à API |

> O Vite lê as variáveis **na hora do build**. Em produção, mudou uma variável? Faça um novo deploy.

## 5. Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento com recarga automática |
| `npm run build` | confere os tipos (`tsc -b`) e gera o pacote em `dist/` |
| `npm run preview` | serve o `dist/` localmente para conferir o build |
| `npm run lint` | análise estática com oxlint |
| `npm test` | roda os testes uma vez com Vitest |

## 6. Estrutura do projeto

```text
src/
├── main.tsx, App.tsx      entrada e todas as rotas
├── api/                   camada de integração
│   ├── config.ts          lê as variáveis VITE_* e escolhe a fonte (api ou simulado)
│   ├── http.ts            wrapper do cliente HTTP (token, idempotência)
│   ├── auth.ts, supabase.ts   login e cliente do Supabase; papel e loja vêm das claims do JWT
│   ├── erros.ts           traduz 401/403/404/409/422/429 em mensagens em português
│   └── tipos.ts           tipos e papéis espelhados do backend
├── lib/                   regra e acesso a dados, por assunto
│   ├── api.ts             cliente HTTP único (Bearer, renovação no 401, timeout)
│   ├── sessao.ts          sessão, cargo e logout
│   ├── navegacao.ts       seções, abas e permissões por cargo
│   ├── destino.ts         para onde ir depois do login (aceita só rotas internas)
│   ├── *Api.ts            uma chamada por rota (estoquePainelApi, chamadosApi, gestaoApi...)
│   └── *Ui.ts             formatação e regras de exibição
├── hooks/                 useConsulta e hooks por tela (useEstoquePainel, useChamados...)
├── layouts/               PortalLayout (loja), PainelLayout e SecaoLayout (painel), ContaLayout
├── pages/
│   ├── portal/            telas da loja do cliente
│   └── painel/            inicio/, estoque/, atendimento/, gestao/
├── components/            peças reutilizáveis (ui.tsx, gráficos, conversa, modais de estoque)
└── index.css              cores e fontes (marinho, creme, dourado)
```

Arquivos `*.test.ts(x)` ficam ao lado do código que testam.

**Onde mexer**

| O quê | Arquivo |
|---|---|
| Cores e fontes | `src/index.css` |
| Menus, abas e permissões por cargo | `src/lib/navegacao.ts` |
| Rotas | `src/App.tsx` |
| Chamadas à API de uma área | `src/lib/<area>Api.ts` |
| Menu e cabeçalho da loja | `src/layouts/PortalLayout.tsx` |

## 7. Telas e permissões

**Loja (qualquer pessoa; conta e sacola pedem login de cliente)**

| Rota | Tela |
|---|---|
| `/` · `/loja` · `/loja/:sku` | início, catálogo e produto |
| `/sacola` | sacola e checkout |
| `/agendar` | agendar ajuste ou prova |
| `/caderno` · `/casas` | conteúdo da marca |
| `/conta/pedidos` · `/conta/atendimento` · `/conta/perfil` | área do cliente |
| `/entrar` | login e criação de conta de cliente |

**Painel (equipe)** — o menu e as rotas mostram só o que o cargo pode abrir; quem digita uma URL sem
permissão volta ao início do painel.

| Seção | Telas | Cargos |
|---|---|---|
| Início | painel do cargo (atendente, operador, gerente, admin) | todos |
| Estoque | Saldo, Movimentações | operador, gerente, admin |
| Estoque | Transferências | operador, gerente |
| Estoque | **Aprovações** (decidir ajustes pedidos pelo operador) | gerente, admin |
| Atendimento | Chamados, Conversas, Clientes | atendente, gerente |
| Gestão | Lojas | gerente, admin |
| Gestão | Catálogo, Usuários, Auditoria, Integrações | admin |

**Fluxo do ajuste de inventário:** o **operador** pede o ajuste (botão na peça ou em Movimentações) → o
pedido fica pendente e o saldo não muda → o **gerente** aprova ou recusa em Estoque → Aprovações.
Gerente e admin não veem o botão de pedir ajuste.

## 8. Integração com a API

Há **uma só porta de saída**: `src/lib/api.ts`. Ela anexa o token (Bearer), tenta renovar a sessão uma vez
quando recebe `401`, aplica timeout, envia `Idempotency-Key` nas escritas que o exigem e traduz os erros.

- **Login:** Supabase Auth (`signInWithPassword`). Não há contas nem senhas no código; cada pessoa entra com a conta criada para ela. Papel e loja vêm das claims `papel` e `loja_id` do token e servem **só para decidir o que mostrar**; quem autoriza é sempre a API.
- **Leituras e escritas:** vão para a API em `/api/v1`. O front só fala direto com o Supabase para Auth, Realtime (chat ao vivo) e Storage (anexos).
- **Chat ao vivo:** Supabase Realtime. O evento só avisa; o conteúdo vem da API pelo cursor da última mensagem, e uma conferência a cada 15 s recupera mensagens se o Realtime cair.
- **Validação de resposta:** toda resposta é validada antes de chegar à tela (`validar*` em cada `*Api.ts`); o corpo de entrada nunca leva `papel`, `id_cliente` nem a loja do próprio usuário.
- **Dados em tela:** o hook `useConsulta` cuida de carregando, erro, recarga e atualização periódica.

A lista completa das rotas da API está em `docs/api.md` do repositório do backend.

## 9. Segurança

- Só variáveis públicas no front; a *service role key* nunca entra aqui.
- O parâmetro `?voltar=` do login só aceita rotas internas do próprio site (`src/lib/destino.ts`), para que um link forjado não mande a pessoa a outro site.
- Sessão lida do Supabase a cada carga; nada sobre cargo fica guardado no navegador. Trocar de conta esvazia a sacola.
- Rotas do painel são protegidas por cargo no front **e** no servidor.
- Cabeçalhos de segurança no deploy (`vercel.json`): `nosniff`, `X-Frame-Options: DENY`, HSTS, `Referrer-Policy`, `Permissions-Policy` e CSP restritiva.

## 10. Testes e qualidade

```bash
npm test          # Vitest
npm run lint      # oxlint
npm run build     # inclui a checagem de tipos
```

Os testes cobrem a camada de dados (validação das respostas da API, cliente HTTP, 401 e renovação), as
regras de permissão e navegação, o destino após o login e a sessão. Os testes de tela renderizam com
`renderToString`.

## 11. Deploy

**Vercel**, a partir da `main`, com framework Vite.

1. **Environment Variables** do projeto (Production): `VITE_API_URL`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Escolha o tipo **Config** (não Secret): elas são públicas e vão para o navegador de qualquer forma.
2. `VITE_API_URL` deve ser a URL do Render **sem barra no fim** (`https://backend-casalorenzi.onrender.com`).
3. Na API (Render), `CORS_ORIGINS` precisa conter a URL exata do site na Vercel.
4. Depois de mudar uma variável, faça **Redeploy**: o Vite as grava no build.

[`vercel.json`](vercel.json) define os cabeçalhos de segurança e a regra que devolve `index.html` para toda
rota da SPA (sem ela, abrir `/entrar` direto dá 404).

> No plano Hobby da Vercel, o deploy é bloqueado se o autor do último commit não for o dono da conta.

## 12. Como contribuir

- Trabalhe em uma **branch própria** a partir de `develop` (`feat/...`, `fix/...`, `docs/...`).
- `develop` é o branch compartilhado; `main` só recebe o que veio dela, já testado.
- Commits no padrão `<tipo>: <descrição>` com os tipos `feat`, `fix`, `style`, `refactor`, `test`, `docs` e `chore`. Exemplo: `feat: adiciona filtro por tamanho no catálogo`.
- Antes de subir: `npm test`, `npm run lint` e `npm run build` limpos.
- Tela nova que lê dados: crie a chamada em `src/lib/<area>Api.ts` com validação da resposta, um hook em `src/hooks/` e teste da validação. Tela do painel também entra em `src/lib/navegacao.ts` com os cargos permitidos.

## 13. Problemas comuns

| Sintoma | Causa provável |
|---|---|
| O site mostra dados de exemplo | está no modo simulado: faltam `VITE_API_URL`, `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` |
| Erro de CORS no navegador | `CORS_ORIGINS` da API sem a URL do front, ou com barra no fim |
| Produção chama `127.0.0.1:8000` | `VITE_API_URL` errada ou mudada sem novo deploy |
| Login da equipe recusado | o hook de claims está desligado no Supabase (token sem `papel`) ou a conta não tem loja |
| Primeira chamada demora ~50 s | o Render gratuito hiberna; espere e tente de novo |
| `/entrar` dá 404 na Vercel | falta a regra de rewrite do `vercel.json` |
| `Failed to resolve import` no Vite | cache do Vite depois de trocar de branch: pare o servidor e rode `npm run dev` de novo |
| `Port 5173 is already in use` | já há um servidor rodando; feche-o (ou abra a porta que o Vite indicar) |
| `429 Aguarde...` | limite de requisições da API; espere o tempo indicado |
