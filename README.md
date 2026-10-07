# Casa Lorenzi — frontend

Loja online e área interna da Casa Lorenzi, recriadas a partir do protótipo do Lovable
("Casa Lorenzi Conecta"). Os dados são simulados (sem backend) e ficam salvos na aba do
navegador enquanto ela estiver aberta.

```bash
npm install
npm run dev
npm test
```

## Fluxo de trabalho

- `develop` é o branch intermediário: todo commit novo entra nele.
- `main` é o branch final: só recebe o que vier de `develop`, depois de testado.
- Commits seguem o padrão `<tipo>: <descrição>`, com os tipos `feat`, `fix`, `style`, `refactor`,
  `test`, `docs` e `chore`. Exemplo: `feat: adiciona filtro por tamanho no catálogo`.
- Cada mudança vai numa branch própria, aberta a partir de `develop`.

## Integração com o backend

O front roda em dois modos, escolhidos por `VITE_FONTE_DADOS` (copie `.env.example` para
`.env.local`):

- `simulado` (padrão): dados em memória, sem backend. É o que roda hoje.
- `api`: Supabase (Auth, leituras com RLS, Realtime, Storage) + FastAPI para as ações sensíveis.

A camada de integração fica em `src/api/` e segue o briefing do backend:

| Arquivo | O que tem |
|---|---|
| `tipos.ts` | Enums espelhados do banco e modelos de entrada/saída de cada rota |
| `backend.ts` | Uma função por rota do FastAPI (`/api/v1`): estoque, compras, atendimento, admin, integração, dashboard |
| `direto.ts` | O que vai direto ao Supabase: catálogo, carrinho, perfil, estoque da loja, fila, mensagens, anexos, avaliação |
| `auth.ts` | Login pelo Supabase Auth; papel e loja lidos das claims do JWT |
| `http.ts` | Bearer, renovação do token no 401, `Idempotency-Key`, timeout |
| `erros.ts` | 401/403/404/409/422/429 viram `ErroApi` com mensagem em português |

Os modelos de entrada nunca levam `papel`, `id_cliente` nem a loja do próprio usuário: o
backend tira esses valores do token. A service role key nunca entra no front.

## Login

O login é o do Supabase Auth (`signInWithPassword`) e há **uma tela só**, `/entrar`, para clientes e
equipe. **Não há contas nem senhas no código do front**: cada pessoa entra com a conta criada para
ela. O tipo de usuário vem do token (claims `papel` e `loja_id`, gravadas pelo hook
`public.hook_claims_token`) e decide o destino: o sistema abre sempre na
loja, sem login. O **cliente** que entra volta para a loja, na página onde estava, agora logado; a
**equipe** é levada ao painel, na tela inicial do cargo. O parâmetro `?voltar=` guarda a tela de
origem, mas só vale se for uma rota do próprio site e que o cargo possa abrir (`src/lib/destino.ts`). A sessão é lida do Supabase a cada carga da página; nada sobre papel fica guardado no
navegador. As contas de cada tipo são criadas pelo script `scripts/criar_contas.py` do backend.

## Onde mexer

| O quê | Arquivo |
|---|---|
| Cores e fontes (marinho, creme, dourado) | `src/index.css` |
| Seções da barra lateral, abas e permissões por cargo | `src/lib/navegacao.ts` |
| Cargos, unidade de cada um e login | `src/lib/sessao.ts` (papéis em `src/api/tipos.ts`) |
| Dados simulados (peças, lojas, clientes, pedidos, chamados) | `src/lib/dados.ts` |
| Ações (movimentar, transferir, aprovar, comprar…) | `src/lib/store.ts` |
| Loja do cliente | `src/layouts/PortalLayout.tsx`, `src/pages/portal/` |
| Área interna | `src/layouts/PainelLayout.tsx`, `src/pages/painel/` |

## Dados reais (início do atendente)

O início do atendente mostra dados da API. As demais telas da área interna e a loja do cliente
ainda usam dados simulados, mas só abrem para quem tem o papel certo (`src/lib/navegacao.ts`).

1. Copie `.env.example` para `.env.local` e preencha `VITE_API_URL`, `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY` (só a chave pública; a service role nunca entra no front).
2. Suba a API (`uvicorn app.main:app --reload` no repositório do backend) com `SUPABASE_URL` e
   `CORS_ORIGINS=http://localhost:5173`.
3. A conta precisa ter linha em `usuario` com papel e loja, e o hook de claims precisa estar ativo
   no Supabase; sem ele o token não traz `papel` e o login da equipe é recusado.
4. Como o `papel` do token só vale para decidir o que mostrar, as leituras diretas ao Supabase (como o
   nome do perfil) passam pelas policies de RLS e só devolvem a linha da própria pessoa.

O papel e a loja exibidos vêm do token, mas só para decidir o que mostrar: quem autoriza é sempre
a API (token validado, papel e loja conferidos no servidor).

## Chamados do atendimento

A fila (`/painel/atendimento`) e a tela do chamado leem e gravam pela API em
`/api/v1/painel/atendimentos` (código em `src/lib/chamadosApi.ts`, hooks em
`src/hooks/useChamados.ts`). Quem aparece em cada seção da fila:

- **Fila**: chamados que ninguém assumiu;
- **Meus chamados**: os que o usuário logado assumiu;
- **Todos**: tudo que o escopo de loja dele permite.

Atendente e gerente veem a própria loja mais os chamados sem loja; o admin vê a rede e pode filtrar
por loja. As ações (assumir, responder, resolver) são validadas no servidor, que devolve 409 com a
explicação em português quando outra pessoa chegou antes. Só gerente e admin veem as compras do
cliente. Os chamados que o cliente abre na loja ainda são simulados e não aparecem nessa fila.

## Chat ao vivo do atendimento

A conversa do chamado (`/painel/atendimento/chamado/:id`) e a caixa de conversas
(`/painel/atendimento/conversas`) funcionam em tempo real sobre o **Supabase Realtime**:

- `GET /api/v1/painel/chat/conversas/{id}/sessao` devolve o canal privado `chamado:<uuid>`, o filtro
  das mensagens e se a pessoa pode responder.
- Mensagens novas chegam por Postgres Changes (`mensagem`). O evento só avisa; o conteúdo vem de
  `GET .../mensagens?apos=<ultima>`, então nada depende do payload do Realtime.
- "Digitando" e "quem está na conversa" usam Broadcast e Presence no canal privado (liberado pelo RLS só
  a quem enxerga o chamado).
- Se o Realtime cair, uma conferência a cada 15 s recupera as mensagens pelo cursor.

Código: `src/lib/chatAoVivo.ts` (lógica, testada com canais falsos), `src/lib/chatApi.ts` (chamadas e
validação) e `src/hooks/useChat.ts` (ligação com o React). Exige a migration do chat no backend.

## Início do gerente

O dashboard do gerente (`/painel`) vem da API, com o escopo de loja decidido no servidor
(`/api/v1/painel/gerencia/dashboard`, `/reposicao` e `/pendencias`, mais `/dashboard/atendimento`
para os chamados da unidade). Mostra faturamento, pedidos e ticket médio contra o período anterior,
faturamento ao longo do tempo, movimento por dia da semana, peças mais vendidas, reposição
prioritária (saldo contra o ritmo de venda), chamados por motivo e mix loja × online. Os filtros de
período, categoria e canal de venda ficam na URL. Código: `src/lib/gerenciaApi.ts`,
`src/lib/gerenciaUi.ts` e `src/hooks/useDashboardGerente.ts`.

## Estoque: saldo e movimentações

As telas **Saldo** e **Movimentações** (`/painel/estoque`) leem a API (`/api/v1/painel/estoque/opcoes`,
`/saldo` e `/movimentacoes`); nada nelas vem do estoque simulado. O escopo de loja é decidido no
servidor: operador e gerente veem a própria unidade, o admin vê a rede (colunas por loja). O operador
vê só as movimentações que ele mesmo registrou. Clicar numa peça do saldo abre o histórico dela.
Os botões de registrar entrada/saída e ajuste ficam desativados até existirem os endpoints de
escrita. Código: `src/lib/estoquePainelApi.ts`, `src/lib/estoquePainelUi.ts` e
`src/hooks/useEstoquePainel.ts`.

## Clientes do atendimento

A lista (`/painel/atendimento/clientes`) e a ficha (`/painel/atendimento/clientes/:id`) leem a API em
`/api/v1/painel/clientes` (código em `src/lib/clientesApi.ts` e `src/hooks/useClientes.ts`).

- **Seções da lista:** Todos, Com chamado em aberto e Meus clientes (os que têm chamado assumido
  por quem está logado). Há busca por nome, e-mail ou telefone e paginação.
- **Rotas privadas:** só atendente, gerente e admin abrem essas telas (mapa em `src/lib/navegacao.ts`,
  testado em `src/lib/rotas.test.ts`); o servidor repete a checagem de papel e de loja.
- **Privacidade:** compras, total gasto e ticket médio só chegam para gerente e admin. Para o
  atendente o servidor manda esses campos nulos e a tela nem monta as colunas e tabelas de compras.
  O documento (CPF) nunca é enviado. Id que não é um UUID nem chega a consultar a API.
