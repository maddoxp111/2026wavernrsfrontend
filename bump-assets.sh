#!/bin/bash
# Stamp every script/stylesheet URL with a version so browsers fetch fresh
# copies after a deploy instead of reusing stored ones. The stamp is derived
# from the contents of the assets themselves, so running this twice without
# editing anything changes nothing, and an edited file always gets a new stamp.
#   ./bump-assets.sh          stamp from current contents
#   ./bump-assets.sh --check  exit 1 if the stamp is out of date
set -e
cd "$(dirname "$0")/frontend"

hash_assets() {
  cat js/*.js css/*.css 2>/dev/null | shasum -a 256 | cut -c1-12
}

V=$(hash_assets)
CHECK=""
[ "$1" = "--check" ] && CHECK=1
[ -n "$1" ] && [ "$1" != "--check" ] && V="$1"

CURRENT=$(grep -ohE 'css/style\.css\?v=[0-9a-z.]+' ./*.html | head -1 | sed 's/.*v=//')

if [ -n "$CHECK" ]; then
  if [ "$CURRENT" = "$V" ]; then
    echo "assets stamped correctly (v=$V)"
    exit 0
  fi
  echo "stale asset stamp: html says v=$CURRENT, contents hash to v=$V" >&2
  echo "run ./bump-assets.sh before committing" >&2
  exit 1
fi

# HTML: src="/js/x.js" or src="/js/x.js?v=old"  ->  src="/js/x.js?v=NEW"; same for /css
sed -i -E "s#(src=\"/js/[^\"?]+\.js)(\?v=[^\"]*)?\"#\1?v=$V\"#g; s#(href=\"/css/[^\"?]+\.css)(\?v=[^\"]*)?\"#\1?v=$V\"#g" *.html
# Scripts loaded from layout.js
sed -i -E "s#(s\.src = '/js/[^'?]+\.js)(\?v=[^']*)?'#\1?v=$V'#g" js/layout.js
echo "assets stamped v=$V"
