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
