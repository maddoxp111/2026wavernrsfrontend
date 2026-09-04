#!/bin/bash
# Stamp every script/stylesheet URL with a version so browsers fetch fresh
# copies after a deploy instead of reusing stored ones. Run before committing
# frontend changes:  ./bump-assets.sh
set -e
cd "$(dirname "$0")/frontend"
V=${1:-$(date -u +%Y%m%d%H%M)}
# HTML: src="/js/x.js" or src="/js/x.js?v=old"  →  src="/js/x.js?v=NEW"; same for /css
sed -i -E "s#(src=\"/js/[^\"?]+\.js)(\?v=[^\"]*)?\"#\1?v=$V\"#g; s#(href=\"/css/[^\"?]+\.css)(\?v=[^\"]*)?\"#\1?v=$V\"#g" *.html
# Scripts loaded from layout.js
sed -i -E "s#(s\.src = '/js/[^'?]+\.js)(\?v=[^']*)?'#\1?v=$V'#g" js/layout.js
echo "assets stamped v=$V"
