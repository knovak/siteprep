#!/usr/bin/env python3
"""Build ../work/index.html — a single self-contained offline file.

The output is the initiative's deployable artifact: the file the branch preview
publishes and the file a release copies to demos/world_migration_atlas/. Running
this script is the only supported way to change the atlas; the bundle is never
edited by hand.
"""
import json, re, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def read(p): return open(os.path.join(ROOT, p), encoding="utf-8").read()

core = re.sub(r"^export ", "", read("src/core.js"), flags=re.M)
app = read("src/app.js")
data = json.dumps(json.load(open(os.path.join(ROOT, "data/migrations.json"))), separators=(",", ":"))
l110 = read("data/basemap/land110.json")
l50 = read("data/basemap/land50.json")

bundle = f"""<script>
{read('vendor_d3array.js')}
{read('vendor_d3geo.js')}
</script>
<script>
{core}
const ATLAS_DATA = {data};
const LAND110 = {l110};
const LAND50 = {l50};
{app}
</script>"""

html = read("src/index.html").replace("<!--BUNDLE-->", bundle)
out = os.path.join(os.path.dirname(ROOT), "work/index.html")
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, "w", encoding="utf-8").write(html)
print("built", out, f"{os.path.getsize(out)/1e6:.2f} MB")
