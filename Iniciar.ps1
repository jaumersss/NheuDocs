Set-Location -LiteralPath $PSScriptRoot
Write-Host 'NheuDocs: http://127.0.0.1:4173 - Ctrl+C para cerrar.'
python -m http.server 4173 --bind 127.0.0.1
