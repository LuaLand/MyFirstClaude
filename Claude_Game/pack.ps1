# 게임 전체를 HTML 파일 하나(dist/Claude_Game.html)로 포장
# - index.html + games/*.html 을 한 파일에 담고, 바깥 틀이 iframe으로 페이지를 바꿔 보여 줌
# - shared.js 같은 로컬 스크립트와 svg 등 그림은 각 페이지 안에 직접 넣음
# - 글꼴(Google Fonts 등)은 인터넷에서 불러옴
# 실행: powershell -ExecutionPolicy Bypass -File pack.ps1

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding $false
$mime = @{ svg = 'image/svg+xml'; png = 'image/png'; jpg = 'image/jpeg'; jpeg = 'image/jpeg'; gif = 'image/gif'; webp = 'image/webp' }

function Read-Text($path) { [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8) }
function Resolve-Local($pageDir, $rel) { [IO.Path]::GetFullPath((Join-Path $pageDir $rel)) }

$pages = [ordered]@{}
$files = @(Get-Item (Join-Path $root 'index.html')) + @(Get-ChildItem (Join-Path $root 'games') -Filter *.html | Sort-Object Name)

foreach ($f in $files) {
  $key = $f.FullName.Substring($root.Length + 1).Replace('\', '/')
  $dir = $f.DirectoryName
  $html = Read-Text $f.FullName

  # <script src="로컬.js"></script> → 내용을 그대로 넣음
  $html = [regex]::Replace($html, '<script src="(?!https?:)([^"]+\.js)"></script>', {
    param($m)
    $js = Read-Text (Resolve-Local $dir $m.Groups[1].Value)
    "<script>`n$js`n</script>"
  })

  # url("그림.svg") 와 src="그림.png" → data URI
  $html = [regex]::Replace($html, '(url\(["'']?|src=")(?!https?:|data:)([^"'')]+\.(svg|png|jpe?g|gif|webp))', {
    param($m)
    $bytes = [IO.File]::ReadAllBytes((Resolve-Local $dir $m.Groups[2].Value))
    $type = $mime[$m.Groups[3].Value.ToLower()]
    $m.Groups[1].Value + "data:$type;base64," + [Convert]::ToBase64String($bytes)
  })

  $pages[$key] = $html
  Write-Host "  + $key"
}

# ConvertTo-Json(5.1)은 < > & ' 를 < 등으로 바꿔 주므로 </script> 가 생기지 않음
$json = $pages | ConvertTo-Json -Compress

$shell = @'
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>미니게임 홈</title>
<style>
  html, body { margin: 0; height: 100%; background: #E9ECF1; }
  @media (prefers-color-scheme: dark) { html, body { background: #1B1D23; } }
  iframe { display: block; width: 100%; height: 100vh; height: 100dvh; border: 0; }
</style>
</head>
<body>
<iframe id="view" title="미니게임"></iframe>
<script id="pages" type="application/json">__PAGES__</script>
<script>
// 포장본 바깥 틀: 페이지 이동 · 뒤로가기 · 이 파일 다시 저장하기
const PAGES = JSON.parse(document.getElementById('pages').textContent);
const view = document.getElementById('view');
let cur = 'index.html';

// 지금 페이지 기준 상대 경로 → 'games/rps.html' 같은 키
function resolve(from, href) {
  const parts = from.split('/'); parts.pop();
  for (const p of href.split('#')[0].split('/')) {
    if (p === '..') parts.pop(); else if (p && p !== '.') parts.push(p);
  }
  return parts.join('/');
}

function show(path, mode) {
  if (!PAGES[path]) path = 'index.html';
  cur = path;
  view.srcdoc = PAGES[path];
  try {
    if (mode === 'push') history.pushState({ path: path }, '', '#' + path);
    else if (mode === 'replace') history.replaceState({ path: path }, '', '#' + path);
  } catch (e) {}
}

window.__pack = {
  go: function (href) { show(resolve(cur, href), 'push'); },
  save: function () {
    const root = document.documentElement.cloneNode(true);
    root.querySelector('#view').removeAttribute('srcdoc');
    const blob = new Blob(['<!doctype html>\n' + root.outerHTML], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Claude_Game.html';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  },
};

view.addEventListener('load', function () {
  try { document.title = view.contentDocument.title || document.title; } catch (e) {}
  view.focus();
});
addEventListener('popstate', function (e) { show((e.state && e.state.path) || 'index.html'); });
show(decodeURIComponent(location.hash.slice(1)) || 'index.html', 'replace');
</script>
</body>
</html>
'@

$out = Join-Path $root 'dist\Claude_Game.html'
New-Item -ItemType Directory -Force (Split-Path $out) | Out-Null
[IO.File]::WriteAllText($out, $shell.Replace('__PAGES__', $json), $utf8)
$kb = [math]::Round((Get-Item $out).Length / 1KB)
Write-Host "완료: dist\Claude_Game.html ($kb KB)"
