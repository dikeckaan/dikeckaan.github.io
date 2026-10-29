#!/usr/bin/env bash
# Submits the site's URLs to IndexNow, which shares them with Bing (and so
# ChatGPT search and Copilot), Yandex, Seznam, Naver and Yep.
# The key is the file 1efee2a6d2cc4b5e9aef21115c66d522.txt at the site root.
set -euo pipefail
KEY=1efee2a6d2cc4b5e9aef21115c66d522
urls=$(grep -o '<loc>[^<]*</loc>' sitemap.xml | sed -e 's/<loc>//' -e 's#</loc>##' | sed 's/.*/"&"/' | paste -sd, -)
urls="$urls,\"https://kaandikec.com/llms.txt\",\"https://kaandikec.com/llms-full.txt\""
body="{\"host\":\"kaandikec.com\",\"key\":\"$KEY\",\"keyLocation\":\"https://kaandikec.com/$KEY.txt\",\"urlList\":[$urls]}"
echo "$body"
code=$(curl -s -o /dev/stderr -w '%{http_code}' -X POST https://api.indexnow.org/indexnow -H 'Content-Type: application/json; charset=utf-8' -d "$body")
echo "IndexNow answered $code"
# 200 = accepted, 202 = accepted and key still being verified
[[ $code == 200 || $code == 202 ]]
