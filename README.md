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

## Acessos de demonstração

Na tela `/entrar` há botões que preenchem os acessos de cada perfil: cliente, atendente,
operador de estoque, gerente de unidade e administrador.

## Onde mexer

| O quê | Arquivo |
|---|---|
| Cores e fontes (marinho, creme, dourado) | `src/index.css` |
| Seções da barra lateral, abas e permissões por cargo | `src/lib/navegacao.ts` |
| Cargos, unidade de cada um e login | `src/lib/sessao.ts` |
| Dados simulados (peças, lojas, clientes, pedidos, chamados) | `src/lib/dados.ts` |
| Ações (movimentar, transferir, aprovar, comprar…) | `src/lib/store.ts` |
| Loja do cliente | `src/layouts/PortalLayout.tsx`, `src/pages/portal/` |
| Área interna | `src/layouts/PainelLayout.tsx`, `src/pages/painel/` |

## Dados reais (início do atendente)

Quem entra com uma **conta real da equipe** (Supabase Auth) vê o início do atendente com dados
da API. Os acessos de demonstração continuam mostrando dados simulados, com um aviso na tela.

1. Copie `.env.example` para `.env.local` e preencha `VITE_API_URL`, `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY` (só a chave pública; a service role nunca entra no front).
2. Suba a API (`uvicorn app.main:app --reload` no repositório do backend) com `SUPABASE_URL` e
   `CORS_ORIGINS=http://localhost:5173`.
3. A conta precisa ter linha em `usuario` com papel e loja, e o hook de claims precisa estar ativo
   no Supabase; sem ele o token não traz `papel` e o login da equipe é recusado.

O papel e a loja exibidos vêm do token, mas só para decidir o que mostrar: quem autoriza é sempre
a API (token validado, papel e loja conferidos no servidor).
