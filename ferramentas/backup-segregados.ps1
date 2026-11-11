# Backup automático do Controle de Segregados (mesmo Supabase do QC: tabela seg_docs e fotos seg/).
# Baixa ocorrências, produtos, custos, fechamentos e fotos para uma pasta do computador.
# Nunca altera nem apaga nada no sistema. Só cópias antigas de dados (não fotos/vídeos) são limpas aqui.
param(
  [switch]$Configurar,
  [switch]$ConfigurarAviso,
  [switch]$AtivarTelegram,
  [string]$Raiz = (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent),
  [string]$Base = 'https://bkbtgbygrvbyjfzdrlxi.supabase.co',
  [string]$Chave = 'sb_publishable_OEzNjc6AryDINoRad9dtxA_bjlkl2NW',
  [int]$CopiasDados = 60
)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.IO.Compression

$Utf8 = New-Object System.Text.UTF8Encoding($false)
$Prog = Join-Path $Raiz '06 - JANELA PRETA\programa'
$Pasta = Join-Path $Raiz '07 - BANCO DE DADOS'
$PastaExcel = Join-Path $Raiz '05 - EXCEL'
$ArqCred = Join-Path $Prog 'credencial.dat'
$ArqLog = Join-Path $Pasta 'relatorio.txt'
$ArqUltimo = Join-Path $Pasta 'ULTIMO-BACKUP.txt'
$ArqWhats = Join-Path $Prog 'aviso-whatsapp.txt'
$ArqTele = Join-Path $Prog 'aviso-telegram.txt'
$ArqVaga = Join-Path $Prog 'whatsapp-vaga-avisada.txt'
$Pastas = @('seg')   # fotos do Segregados; galeria/ e reg/ são do QC

function Log($t) {
  $l = (Get-Date -Format 'dd/MM/yyyy HH:mm:ss') + '  ' + $t
  Write-Host $l
  [IO.File]::AppendAllText($ArqLog, $l + "`r`n", $Utf8)
}

function Web($token) {
  $w = New-Object Net.WebClient
  $w.Encoding = [Text.Encoding]::UTF8
  $w.Headers['apikey'] = $Chave
  if ($token) { $w.Headers['Authorization'] = "Bearer $token" }
  return $w
}

function Entrar($email, $senha) {
  $corpo = @{ email = [string]$email; password = [string]$senha } | ConvertTo-Json -Compress
  $w = Web $null
  $w.Headers['Content-Type'] = 'application/json'
  $r = $w.UploadString("$Base/auth/v1/token?grant_type=password", 'POST', $corpo) | ConvertFrom-Json
  return $r.access_token
}

function LerCredencial {
  if (-not (Test-Path $ArqCred)) { throw 'Backup ainda não configurado. Abra CONFIGURAR-BACKUP.bat.' }
  $l = Get-Content $ArqCred
  $seg = $l[1] | ConvertTo-SecureString
  $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($seg)
  try { $senha = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
  return @{ email = $l[0]; senha = $senha }
}

function EsperarInternet {
  for ($i = 0; $i -lt 60; $i++) {
    try { (Web $null).DownloadString("$Base/auth/v1/health") | Out-Null; return } catch { Start-Sleep -Seconds 10 }
  }
  throw 'Sem conexão com o sistema depois de 10 minutos.'
}

# Junta as páginas de 1.000 linhas em um único JSON, sem reescrever o conteúdo
function BaixarTabela($token, $consulta, $ordem = 'id.asc') {
  $partes = New-Object Collections.ArrayList
  $total = 0; $de = 0
  while ($true) {
    $t = (Web $token).DownloadString("$Base/rest/v1/$consulta&order=$ordem&limit=1000&offset=$de")
    $v = $t | ConvertFrom-Json   # no PowerShell 5.1 a lista chega como um objeto só: não usar @()
    $n = if ($t.Trim() -eq '[]') { 0 } else { $v.Count }
    if ($n -gt 0) { [void]$partes.Add($t.Trim().Substring(1, $t.Trim().Length - 2)) }
    $total += $n; $de += 1000
    if ($n -lt 1000) { break }
  }
  return @{ json = '[' + ($partes -join ',') + ']'; total = $total }
}

function ListarArquivos($token, $prefixo) {
  $out = New-Object Collections.ArrayList
  $de = 0
  while ($true) {
    $w = Web $token
    $w.Headers['Content-Type'] = 'application/json'
    $corpo = '{"prefix":"' + $prefixo + '","limit":1000,"offset":' + $de + ',"sortBy":{"column":"name","order":"asc"}}'
    $l = $w.UploadString("$Base/storage/v1/object/list/fotos", 'POST', $corpo) | ConvertFrom-Json
    foreach ($x in $l) { if ($x.id -and $x.name) { [void]$out.Add($x) } }
    $de += 1000
    if ($l.Count -lt 1000) { break }
  }
  return $out
}

function Xml($v) {
  $s = [string]$v
  $s = $s -replace '[\x00-\x08\x0B\x0C\x0E-\x1F]', ''
  return [Security.SecurityElement]::Escape($s)
}

function ColunaLetra($n) { $s = ''; $n++; while ($n -gt 0) { $m = ($n - 1) % 26; $s = [char](65 + $m) + $s; $n = [math]::Floor(($n - 1) / 26) }; return $s }

function PlanilhaXml($linhas) {
  $b = New-Object Text.StringBuilder
  [void]$b.Append('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>')
  $r = 0
  foreach ($l in $linhas) {
    $r++
    [void]$b.Append("<row r=""$r"">")
    for ($c = 0; $c -lt $l.Count; $c++) {
      $v = $l[$c]
      if ($null -eq $v -or "$v" -eq '') { continue }
      $ref = (ColunaLetra $c) + $r
      if ($v -is [int] -or $v -is [long] -or $v -is [double] -or $v -is [decimal]) { [void]$b.Append("<c r=""$ref""><v>$([string]::Format([Globalization.CultureInfo]::InvariantCulture, '{0}', $v))</v></c>") }
      else { [void]$b.Append("<c r=""$ref"" t=""inlineStr""><is><t xml:space=""preserve"">$(Xml $v)</t></is></c>") }
    }
    [void]$b.Append('</row>')
  }
  [void]$b.Append('</sheetData></worksheet>')
  return $b.ToString()
}

function GravarXlsx($caminho, $abas) {
  if (Test-Path $caminho) { Remove-Item $caminho -Force }
  $fs = [IO.File]::Open($caminho, 'Create')
  $zip = New-Object IO.Compression.ZipArchive($fs, [IO.Compression.ZipArchiveMode]::Create)
  function Entrada($nome, $texto) {
    $e = $zip.CreateEntry($nome)
    $s = $e.Open(); $bytes = $Utf8.GetBytes($texto); $s.Write($bytes, 0, $bytes.Length); $s.Close()
  }
  $tipos = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
  $folhas = ''; $rel = ''
  for ($i = 0; $i -lt $abas.Count; $i++) {
    $n = $i + 1
    $tipos += "<Override PartName=""/xl/worksheets/sheet$n.xml"" ContentType=""application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml""/>"
    $folhas += "<sheet name=""$(Xml $abas[$i].nome)"" sheetId=""$n"" r:id=""rId$n""/>"
    $rel += "<Relationship Id=""rId$n"" Type=""http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"" Target=""worksheets/sheet$n.xml""/>"
    Entrada "xl/worksheets/sheet$n.xml" (PlanilhaXml $abas[$i].linhas)
  }
  Entrada '[Content_Types].xml' ($tipos + '</Types>')
  Entrada '_rels/.rels' '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
  Entrada 'xl/workbook.xml' ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + $folhas + '</sheets></workbook>')
  Entrada 'xl/_rels/workbook.xml.rels' ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + $rel + '</Relationships>')
  $zip.Dispose(); $fs.Close()
}

# Avisos: notificação no Windows e, se configurado, WhatsApp (CallMeBot) ou Telegram
function AvisoWindows($titulo, $texto) {
  try {
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
    $x = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
    $t = $x.GetElementsByTagName('text')
    [void]$t.Item(0).AppendChild($x.CreateTextNode($titulo))
    [void]$t.Item(1).AppendChild($x.CreateTextNode($texto))
    $n = New-Object Windows.UI.Notifications.ToastNotification($x)
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe').Show($n)
  } catch { Log "Aviso do Windows não exibido: $($_.Exception.Message)" }
}
function AvisoCelular($texto) {
  $msg = [Uri]::EscapeDataString($texto)
  if (Test-Path $ArqWhats) {
    try {
      $c = Get-Content $ArqWhats
      if (-not $c[1]) { throw 'chave (apikey) vazia: rode CONFIGURAR-AVISO-CELULAR.bat de novo' }
      $r = (Web $null).DownloadString("https://api.callmebot.com/whatsapp.php?phone=$([Uri]::EscapeDataString($c[0]))&text=$msg&apikey=$([Uri]::EscapeDataString($c[1]))")
      if ($r -notmatch 'queued|Message to:') { throw ('CallMeBot respondeu: ' + (($r -replace '<[^>]+>', ' ' -replace '\s+', ' ').Trim()).Substring(0, [Math]::Min(160, ($r -replace '<[^>]+>', ' ' -replace '\s+', ' ').Trim().Length))) }
      Log 'Aviso enviado pelo WhatsApp'
    } catch { Log "Aviso pelo WhatsApp não enviado: $($_.Exception.Message)" }
  }
  if (Test-Path $ArqTele) {
    try {
      $c = Get-Content $ArqTele
      (Web $null).DownloadString("https://api.telegram.org/bot$($c[0])/sendMessage?chat_id=$([Uri]::EscapeDataString($c[1]))&text=$msg") | Out-Null
      Log 'Aviso enviado pelo Telegram'
    } catch { Log "Aviso pelo Telegram não enviado: $($_.Exception.Message)" }
  }
}
# Enquanto o WhatsApp não estiver configurado, confere se o CallMeBot abriu vagas e avisa uma única vez
function VerVagaWhatsApp {
  if ((Test-Path $ArqWhats) -or (Test-Path $ArqVaga)) { return }
  try {
    $pg = (Web $null).DownloadString('https://www.callmebot.com/blog/free-api-whatsapp-messages/')
    if ($pg -match 'currently full') { return }
    $num = if ($pg -match '\+34[\d ]{8,14}\d') { $Matches[0] } else { '(veja no site do CallMeBot)' }
    $t = "O WhatsApp do CallMeBot abriu vagas. Salve o contato $num, mande a mensagem: I allow callmebot to send me messages. Depois abra CONFIGURAR-AVISO-CELULAR.bat e escolha 1."
    AvisoWindows 'Backup Segregados: WhatsApp disponível' $t
    AvisoCelular $t
    [IO.File]::WriteAllText($ArqVaga, (Get-Date -Format 'dd/MM/yyyy HH:mm') + "`r`n" + $t, $Utf8)
    Log 'Avisado: WhatsApp do CallMeBot com vagas'
  } catch { }
}
function Avisar($ok, $texto) {
  $titulo = if ($ok) { 'Backup Segregados concluído' } else { 'Backup Segregados com ERRO' }
  AvisoWindows $titulo $texto
  AvisoCelular ("$titulo - $(Get-Date -Format 'dd/MM HH:mm')`n$texto")
}

# Grava a planilha; se ela estiver aberta no Excel, salva uma cópia "(NOVO - feche o Excel)" em vez de falhar o backup
function GravarXlsxSeguro($nome, $abas) {
  $xlsx = Join-Path $PastaExcel "$nome.xlsx"; $novo = Join-Path $PastaExcel "$nome (NOVO - feche o Excel).xlsx"
  try { GravarXlsx $xlsx $abas; if (Test-Path $novo) { Remove-Item $novo -Force -ErrorAction SilentlyContinue }; return '' }
  catch {
    Log "$nome.xlsx estava aberto no Excel; dados, fotos e vídeos foram salvos normalmente"
    try { GravarXlsx $novo $abas; return " | Excel $nome estava aberto: salvo como ""$nome (NOVO - feche o Excel).xlsx""" } catch { return " | Excel $nome estava aberto e não foi atualizado" }
  }
}

# Sistema de Segregados (mesmo Supabase, tabela seg_docs): cada linha é um item (col = coleção, id, dados)
function BackupSegregados($token, $dest) {
  $w = Web $token; $w.Headers['Content-Type'] = 'application/json'
  if (($w.UploadString("$Base/rest/v1/rpc/seg_bloqueado", 'POST', '{}')).Trim() -eq 'true') {
    return @{ ok = $false; res = 'Segregados: NÃO salvo (a conta de backup está "Sem acesso" no Segregados; devolva o acesso em Administração)' }
  }
  $docs = BaixarTabela $token 'seg_docs?select=col,id,dados,atualizado_em' 'col.asc,id.asc'
  [IO.File]::WriteAllText((Join-Path $dest 'segregados.json'), $docs.json, $Utf8)

  # Mesmo formato do "Exportar backup (JSON)" do sistema: pode ser importado em Dados & Backup
  $arr = @('occurrences', 'products', 'clients', 'costs', 'costImports', 'costLog', 'closureLog', 'authLog'); $map = @('closures', 'weekDone'); $lst = @('problems', 'destinations')
  $st = [ordered]@{ app = 'segregados-prototipo'; version = 3; settings = $null; users = @([ordered]@{ id = 'u1'; username = 'admin'; password = ''; name = 'Administrador'; role = 'admin' }); reopenCodes = @() }
  foreach ($k in $arr) { $st[$k] = New-Object Collections.ArrayList }
  foreach ($k in $map) { $st[$k] = [ordered]@{} }
  foreach ($k in $lst) { $st[$k] = New-Object Collections.ArrayList }
  $linhas = $docs.json | ConvertFrom-Json   # no PowerShell 5.1 a lista chega como um objeto só: não usar @()
  foreach ($l in $linhas) {
    if ($arr -contains $l.col) { [void]$st[$l.col].Add($l.dados) }
    elseif ($map -contains $l.col) { $st[$l.col][$l.id] = $l.dados }
    elseif ($lst -contains $l.col) { [void]$st[$l.col].Add($l.dados.v) }
    elseif ($l.col -eq 'settings') { $st.settings = $l.dados }
  }
  if (-not $st.settings) { $st.settings = [ordered]@{ company = ''; currency = 'BRL' } }
  $sis = [ordered]@{ app = 'segregados-prototipo'; exportedAt = (Get-Date).ToUniversalTime().ToString('o'); state = $st } | ConvertTo-Json -Depth 30 -Compress
  [IO.File]::WriteAllText((Join-Path $dest 'segregados-para-importar.json'), $sis, $Utf8)

  # Excel para consulta
  $resp = @{ tbd = 'A definir'; client = 'Cliente'; company = 'Empresa'; supplier = 'Fornecedor' }
  $rOc = New-Object Collections.ArrayList
  [void]$rOc.Add(@('Nº', 'Data', 'Origem', 'Cliente / origem', 'Código', 'Modelo', 'Problema', 'Operador', 'Qtd NG', 'Custo unitário', 'Custo total', 'Responsável pelo custo', 'Destino', 'Fotos', 'Registrado por', 'Demo'))
  foreach ($o in ($st.occurrences | Sort-Object { $_.date }, { [long]$_.seq })) {
    $orig = if ($o.originType -eq 'internal') { 'Interno' } else { 'Cliente' }
    $r = if ($resp.ContainsKey([string]$o.costResp)) { $resp[[string]$o.costResp] } else { $o.costResp }
    $uc = if ($null -eq $o.unitCost -or "$($o.unitCost)" -eq '') { '' } else { Num $o.unitCost }
    $tc = if ($null -eq $o.totalCost -or "$($o.totalCost)" -eq '') { '' } else { Num $o.totalCost }
    [void]$rOc.Add(@((Num $o.seq), (DataBr $o.date), $orig, $o.client, $o.code, $o.model, $o.problem, $o.operator, (Num $o.qty), $uc, $tc, $r, $o.destination, @($o.photos).Count, $o.createdBy, $(if ($o.demo) { 'Sim' } else { '' })))
  }
  $rCu = New-Object Collections.ArrayList
  [void]$rCu.Add(@('Vigência', 'Código', 'Modelo', 'Custo unitário', 'Substituído'))
  foreach ($c in ($st.costs | Sort-Object { $_.from }, { $_.code })) { [void]$rCu.Add(@((DataBr $c.from), $c.code, $c.model, (Num $c.cost), $(if ($c.superseded) { 'Sim' } else { '' }))) }
  $aviso = GravarXlsxSeguro 'SEGREGADOS-BACKUP' @(@{ nome = 'Ocorrências'; linhas = $rOc }, @{ nome = 'Custos'; linhas = $rCu })
  return @{ ok = $true; res = "Segregados: $($st.occurrences.Count) ocorrências, $($st.costs.Count) preços$aviso" }
}

function DataBr($d) { if ($d -match '^(\d{4})-(\d{2})-(\d{2})') { return "$($Matches[3])/$($Matches[2])/$($Matches[1])" }; return [string]$d }
function Num($v) { if ($null -eq $v -or "$v" -eq '') { return 0 }; try { return [double]$v } catch { return 0 } }

function Backup {
  New-Item -ItemType Directory -Force -Path (Join-Path $Pasta 'arquivos'), (Join-Path $Pasta 'dados') | Out-Null
  Log 'Iniciando backup'
  EsperarInternet
  $c = LerCredencial
  $token = Entrar $c.email $c.senha

  $stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
  $dest = Join-Path $Pasta "dados\$stamp"
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  $seg = BackupSegregados $token $dest

  # Fotos: baixa só o que falta; nada é apagado desta pasta
  $novos = 0; $iguais = 0; $falhas = 0; $mb = 0.0
  foreach ($p in $Pastas) {
    $dir = Join-Path $Pasta "arquivos\$p"
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    foreach ($a in (ListarArquivos $token $p)) {
      $alvo = Join-Path $dir $a.name
      $tam = [long]$a.metadata.size
      $mb += $tam / 1MB
      if ((Test-Path $alvo) -and (Get-Item $alvo).Length -eq $tam) { $iguais++; continue }
      try {
        $tmp = "$alvo.baixando"
        (Web $token).DownloadFile("$Base/storage/v1/object/authenticated/fotos/$p/$([Uri]::EscapeDataString($a.name))", $tmp)
        if ((Get-Item $tmp).Length -ne $tam) { throw 'tamanho diferente do esperado' }
        Move-Item $tmp $alvo -Force
        $novos++
      } catch { $falhas++; Log "FALHA no arquivo $p/$($a.name): $($_.Exception.Message)"; if (Test-Path $tmp) { Remove-Item $tmp -Force } }
    }
  }

  # Mantém as cópias de dados mais recentes; fotos nunca são apagadas
  Get-ChildItem (Join-Path $Pasta 'dados') -Directory | Sort-Object Name -Descending | Select-Object -Skip $CopiasDados | Remove-Item -Recurse -Force

  $res = "$($seg.res) | Fotos novas: $novos | Já salvas: $iguais | Falhas: $falhas | Total de fotos: $([math]::Round($mb,1)) MB"
  Log "Concluído. $res"
  $st = if ($falhas -or -not $seg.ok) { 'CONCLUÍDO COM FALHAS' } else { 'OK' }
  [IO.File]::WriteAllText($ArqUltimo, "$st - $(Get-Date -Format 'dd/MM/yyyy HH:mm')`r`n$res`r`n", $Utf8)
  Avisar (-not $falhas -and $seg.ok) ($res -replace ' \| ', "`n")
}

New-Item -ItemType Directory -Force -Path $Prog, $Pasta, $PastaExcel | Out-Null
try {
  if ($AtivarTelegram) {
    # Sem digitar nada: usa o token copiado e conversa por caixas de aviso do Windows
    Add-Type -AssemblyName System.Windows.Forms
    function Caixa($t, $tipo) { [void][Windows.Forms.MessageBox]::Show($t, 'Aviso do Backup Segregados no Telegram', 'OK', $tipo) }
    try { $tok = ((Get-Clipboard -Raw) -as [string]).Trim() } catch { $tok = '' }
    if ($tok -match '(\d{6,}:[\w-]{30,})') { $tok = $Matches[1] } else { Caixa "O que está copiado não é o token ($($tok.Length) caracteres).`n`nNo Telegram do computador, abra o BotFather, clique na linha do token para copiar e abra este arquivo de novo." 'Warning'; exit 1 }
    try { $eu = ((Web $null).DownloadString("https://api.telegram.org/bot$tok/getMe") | ConvertFrom-Json).result } catch { Caixa 'O Telegram não aceitou esse token. Copie de novo a linha do BotFather e abra este arquivo de novo.' 'Warning'; exit 1 }
    Caixa "Seu bot é: $($eu.first_name)  (@$($eu.username))`n`nClique em OK e, em até 3 minutos, abra o Telegram, procure @$($eu.username), toque em Começar e mande: oi" 'Information'
    $ult = $null
    for ($i = 0; $i -lt 60 -and -not $ult; $i++) {
      $up = (Web $null).DownloadString("https://api.telegram.org/bot$tok/getUpdates") | ConvertFrom-Json
      $ult = $up.result | Where-Object { $_.message -and $_.message.chat.type -eq 'private' } | Select-Object -Last 1
      if (-not $ult) { Start-Sleep -Seconds 3 }
    }
    if (-not $ult) { Caixa "Não chegou mensagem para @$($eu.username) em 3 minutos.`n`nMande oi para esse bot e abra este arquivo de novo." 'Warning'; exit 1 }
    @($tok, [string]$ult.message.chat.id) | Set-Content -Path $ArqTele -Encoding ASCII
    AvisoCelular 'Teste do aviso do Backup Segregados: se você recebeu esta mensagem, o aviso está funcionando.'
    Log 'Telegram ativado'
    Caixa "Pronto! O aviso no Telegram está ativado.`n`nConfira a mensagem de teste enviada por @$($eu.username)." 'Information'
    exit 0
  }
  if ($ConfigurarAviso) {
    Write-Host 'Configurar aviso no celular do Backup Segregados' -ForegroundColor Cyan
    Write-Host 'Você pode configurar os dois. Rode de novo para configurar o outro.'
    $tipo = (Read-Host 'Digite 1 para WhatsApp (CallMeBot) ou 2 para Telegram').Trim()
    if ($tipo -eq '1') {
      $fone = (Read-Host 'Seu número do WhatsApp com +55 e DDD (ex.: +5511999998888)').Trim() -replace '[\s\-\(\)]', ''
      $chave = (Read-Host 'Chave (apikey) recebida do CallMeBot').Trim()
      if (-not $chave) { throw 'A chave do CallMeBot ficou vazia. Ela só existe depois que o bot do CallMeBot responder no seu WhatsApp.' }
      @($fone, $chave) | Set-Content -Path $ArqWhats -Encoding ASCII
    } elseif ($tipo -eq '2') {
      Write-Host 'Copie o token no Telegram DO COMPUTADOR (web.telegram.org ou Telegram Desktop) e aperte Enter abaixo.'
      $tok = (Read-Host 'Aperte Enter para usar o que foi copiado (ou cole o token)').Trim()
      if (-not $tok) { try { $tok = ((Get-Clipboard -Raw) -as [string]).Trim() } catch { $tok = '' } }
      if ($tok -match '(\d{6,}:[\w-]{30,})') { $tok = $Matches[1] }
      if ($tok -notmatch '^\d+:[\w-]{20,}$') { throw "Token inválido (recebido: $($tok.Length) caracteres). Copie a linha inteira do BotFather no Telegram do computador e tente de novo." }
      Write-Host 'Token reconhecido.' -ForegroundColor Green
      try { $eu = ((Web $null).DownloadString("https://api.telegram.org/bot$tok/getMe") | ConvertFrom-Json).result } catch { throw 'O Telegram não aceitou esse token. Copie de novo a linha do BotFather.' }
      Write-Host ''
      Write-Host "Seu bot é: $($eu.first_name)  (@$($eu.username))" -ForegroundColor Yellow
      Write-Host "Agora, no Telegram, abra https://t.me/$($eu.username) , toque em Começar e mande: oi" -ForegroundColor Yellow
      Write-Host 'Esperando a sua mensagem (até 3 minutos)...'
      $ult = $null
      for ($i = 0; $i -lt 60 -and -not $ult; $i++) {
        $up = (Web $null).DownloadString("https://api.telegram.org/bot$tok/getUpdates") | ConvertFrom-Json
        $ult = $up.result | Where-Object { $_.message -and $_.message.chat.type -eq 'private' } | Select-Object -Last 1
        if (-not $ult) { Start-Sleep -Seconds 3 }
      }
      if (-not $ult) { throw "Não chegou mensagem para @$($eu.username) em 3 minutos. Mande oi para esse bot e abra de novo." }
      Write-Host "Mensagem recebida de $($ult.message.chat.first_name)." -ForegroundColor Green
      @($tok, [string]$ult.message.chat.id) | Set-Content -Path $ArqTele -Encoding ASCII
    } else { throw 'Opção inválida. Abra de novo e digite 1 ou 2.' }
    AvisoCelular 'Teste do aviso do Backup Segregados: se você recebeu esta mensagem, o aviso está funcionando.'
    Write-Host 'Mensagem de teste enviada. Confira no celular (se não chegar, veja relatorio.txt).' -ForegroundColor Green
    exit 0
  }
  if ($Configurar) {
    Write-Host 'Configurar backup do Controle de Segregados' -ForegroundColor Cyan
    Write-Host 'Use uma conta com acesso ao Segregados (a mesma do backup do QC serve). A senha fica criptografada neste usuário do Windows.'
    $email = Read-Host 'E-mail da conta de backup'
    $seg = Read-Host 'Senha da conta de backup' -AsSecureString
    @($email.Trim(), ($seg | ConvertFrom-SecureString)) | Set-Content -Path $ArqCred -Encoding ASCII
    $c = LerCredencial
    Entrar $c.email $c.senha | Out-Null
    Write-Host 'Login confirmado. Fazendo o primeiro backup...' -ForegroundColor Green
  }
  Backup
} catch {
  $m = $_.Exception.Message
  if ($m -match '\(400\)') { $m = 'e-mail ou senha da conta de backup incorretos' }
  Log "ERRO: $m"
  if ($ConfigurarAviso) { Write-Host "ERRO: $m" -ForegroundColor Red; exit 1 }
  [IO.File]::WriteAllText($ArqUltimo, "ERRO - $(Get-Date -Format 'dd/MM/yyyy HH:mm')`r`n$m`r`n", $Utf8)
  Avisar $false $m
  exit 1
}
