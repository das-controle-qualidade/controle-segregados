#!/bin/bash
# Monta o sistema a partir das partes. Rode dentro desta pasta: bash build.sh
# saida/index.html = versão online (vai para a raiz do site), saida/offline.html = arquivo offline,
# saida/teste.html = online com Supabase simulado (fake_sb.js), só para testar no computador.
cd "$(dirname "$0")"; mkdir -p saida
I="a2_logo.js $(for i in $(seq 1 23); do echo b_i18n$i.js; done)"
cat a_head.html $I g_offline.js c_app.js > saida/offline.html
cat a_head.html $I g_online.js c_app.js > saida/index.html
sed '/supabase-js@2/d' g_online.js > saida/g_online_fake.js
cat a_head.html $I fake_sb.js saida/g_online_fake.js c_app.js > saida/teste.html
rm saida/g_online_fake.js
