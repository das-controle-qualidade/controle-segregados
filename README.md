# Controle de Segregados

Sistema online de peças segregadas/sucateadas (DAS). Página única (`index.html`) publicada no GitHub Pages.

- Login e dados: Supabase, mesmo projeto do sistema QC, tabelas com prefixo `seg_` (`supabase/segregados.sql`).
- Fotos: Storage privado `fotos`, pasta `seg/`.
- A chave no código é a chave publicável; os dados são protegidos pelas regras (RLS) do banco.
