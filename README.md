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
