# Instruções para o Copilot — Confectime

Aplicativo de gestão de produção de costura. Responda e comente sempre em português do Brasil.

## Stack e convenções
- Vite + React + TypeScript, TanStack Router (rotas por arquivo em `src/routes/`), Tailwind 4, componentes shadcn "base-nova" (Base UI) em `src/components/ui/`.
- Banco e login: Supabase. Cliente em `src/lib/supabase.ts`; variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no `.env` local. Nunca coloque chaves secretas (`service_role`) no código nem no repositório.
- Imports com o alias `@/` (aponta para `src/`).
- Não existe `react-query` nem biblioteca de toasts: busque dados com `useState` + `useEffect` e mostre avisos na própria tela. Não adicione dependências novas sem necessidade.
- Textos da interface, nomes de tabelas, colunas, funções e variáveis em português.
- `src/routeTree.gen.ts` é gerado automaticamente: não edite à mão. Para regenerar: `npm run generate-routes`.
- Scripts disponíveis: `npm run dev` (porta 3000), `npm run generate-routes`, `npm run typecheck` (verifica tipos sem gerar arquivos), `npm run build` (não verifica tipos), `npm run preview`.
- Alterações no banco vão em um novo arquivo numerado em `sql/` (ex.: `sql/002_descricao.sql`), sempre idempotente (`if not exists`, `drop policy if exists`) e com RLS ligada.

## Regra de negócio
- Cada costureira tem seu próprio tempo médio (minutos por peça) em cada tarefa. Quem cadastra é o líder, na tela `/tarefas`.
- Não existe tempo padrão único por tarefa: uma costureira pode ser ótima numa tarefa e ir mal em outra. Nunca substitua os tempos individuais por uma média geral.

## Banco de dados (Supabase)
- `costureiras`, `sessoes_producao`, `apontamentos_producao`: produção diária (ver `src/lib/production.ts`).
- `operacoes` (nome único, ex.: "20 - FECHAR LATERAL") e `tempos_operacao` (`operacao_id`, `costureira_id`, `minutos_por_peca`, único por par): catálogo de tarefas e tempo de cada costureira (ver `src/lib/tarefas.ts`).
- `perfis` (nome de exibição do usuário) e `user_roles` + função `has_role`: acesso de administrador às tarefas.
- Consultas ao Supabase devolvem no máximo cerca de 1000 linhas por requisição. Para listas que podem crescer, use filtro de período, `.range()` ou agregação no banco.
