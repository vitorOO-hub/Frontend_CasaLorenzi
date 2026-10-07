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
- Commits seguem o padrão `<tipo>(escopo opcional): <descrição>`, com os tipos
  `feat`, `fix`, `style`, `refactor`, `test`, `docs` e `chore`.
  Exemplo: `feat(loja): adiciona filtro por tamanho no catálogo`.

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

## Acessos de demonstração

Na tela `/entrar` há botões que preenchem os acessos de cada perfil: cliente, atendente,
operador de estoque, gerente de unidade e administrador.

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
