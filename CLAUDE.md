# Controle de Segregados

Site: https://das-controle-qualidade.github.io/controle-segregados/ (GitHub Pages publica a cada push na `main`).
Responder sempre em português, passo a passo (o usuário é iniciante).

## Pastas organizadas: atualizar sempre

Toda mudança no Segregados termina atualizando a pasta
`C:\Users\italo\OneDrive\Documentos\CONTROLE DE SEGREGADOS`, sem perguntar:

- `01 - SITE CONTROLE DE SEGREGADOS\Segregados-Offline.html`: copiar de `fonte/saida/offline.html`.
- `03 - PROMPT DO SISTEMA\PROMPT DO SISTEMA.txt` e `04 - SKILL\SKILL.md`: quando mudarem funções, regras, links ou estrutura.
- `05 - EXCEL`: quando mudar o modelo de importação de custos ou o `SEGREGADOS-BACKUP.xlsx`.
- `06 - JANELA PRETA\programa\backup-segregados.ps1`: copiar de `ferramentas/backup-segregados.ps1` quando o backup mudar.
- `07 - BANCO DE DADOS`: rodar `06 - JANELA PRETA\FAZER-BACKUP-AGORA.bat` quando tabelas ou conteúdo do backup mudarem.
- `08 - FERRAMENTAS DO SISTEMA` e `09 - MELHORIAS FUTURAS`: manter em dia.

No fim da resposta, informar em uma lista curta "Pastas atualizadas" (ou "nenhuma pasta precisou mudar").

## Regras do usuário

- Confirmar se o pedido é do Segregados ou do QC. A pasta do QC (`CONTROLE DE QUALIDADE QC`, repositório em `Downloads\GitHub`) é outra.
- Nunca apagar registros, fotos ou dados reais; explicar e perguntar antes de mudanças grandes ou de apagar algo.
- Testar antes de publicar (`fonte/saida/teste.html` usa um Supabase simulado) e dizer o que não foi testado.
- Nada de senhas ou chaves secretas no código (a chave publicável do Supabase pode ficar).
- Não usar `confirm()`, `prompt()` ou `alert()` do navegador: usar `askYes` / `askText` do próprio sistema.

## Código

- `fonte/`: partes do sistema. `bash fonte/build.sh` gera `fonte/saida/index.html` (online), `offline.html` e `teste.html`.
  Depois de testar, copiar `fonte/saida/index.html` para a raiz e publicar.
- `c_app.js` é comum às duas versões; `g_online.js` (Supabase) e `g_offline.js` definem `ONLINE`.
- Textos em 20 idiomas: arquivos `b_i18n*.js` (novos textos vão em um arquivo novo, em todos os idiomas).
- `supabase/segregados.sql`: tabelas `seg_docs`, `seg_papeis`, `seg_senha` e funções (mesmo projeto do QC).
- `ferramentas/backup-segregados.ps1`: backup do notebook (tarefa "Backup Segregados": ao entrar no Windows e às 12h).
