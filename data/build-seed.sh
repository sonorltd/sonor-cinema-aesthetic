#!/bin/bash
# Regenerates data/aesthetic-catalogue.js from v_aesthetic_catalogue (same endpoint the engine reads).
# Usage: bash data/build-seed.sh   (needs network; anon key read from ../sonor-db.js)
set -e
cd "$(dirname "$0")"
K=$(grep -o "eyJ[A-Za-z0-9_.-]*" ../sonor-db.js | head -1)
curl -s "https://ysmvklstkzodlocttspy.supabase.co/rest/v1/v_aesthetic_catalogue?select=id,category,name,manufacturer,hex,swatch_img,img,tier,note,metadata,sort_order&order=category,sort_order" \
  -H "apikey: $K" -H "Authorization: Bearer $K" > /tmp/_aesthetic_seed.json
python3 - <<'PY'
import json, datetime
rows = json.load(open('/tmp/_aesthetic_seed.json'))
d = datetime.date.today().isoformat()
out = "/* Sonor Cinema Aesthetic — Tier-3 offline seed (GENERATED %s)\n   window.__AESTHETIC_SEED__ — snapshot of v_aesthetic_catalogue. Regenerate: bash data/build-seed.sh.\n   NO trade pricing in this seed (seating-library-ssot §4).\n*/\n(function () {\n  window.__AESTHETIC_SEED__ = { generated: '%s', items:\n" % (d, d)
out += json.dumps(rows, indent=1, ensure_ascii=False)
out += "\n  };\n})();\n"
open('aesthetic-catalogue.js','w').write(out)
print('seed regenerated:', len(rows), 'items')
PY
