"""Decode browser-retrieved batch JPEGs using native Pillow and independent expectations."""
import json,hashlib,pathlib
import PIL
from PIL import Image
root=pathlib.Path(__file__).resolve().parent.parent/'evidence/batch'
receipt=json.loads((root/'browser.json').read_text())
assert all(r['pass'] for r in receipt['engines'])
results=[]
for row in receipt['files']:
    data=(root/row['file']).read_bytes()
    assert hashlib.sha256(data).hexdigest()==row['sha256']
    with Image.open(root/row['file']) as image:
        image.load()
        assert image.format=='JPEG' and image.size==(row['size'],)*2
        tags=image.getexif();nested=tags.get_ifd(34665)
        assert tags[306]==row['local'] and tags[305]=='Photo markers'
        for key in (36867,36868):assert nested[key]==row['local']
        for key in (36880,36881,36882):assert nested[key]==row['offset']
        results.append(row)
(root/'independent-files.json').write_text(json.dumps({'oracle':'native Pillow','version':PIL.__version__,'files':results},indent=2)+'\n')
print(f'PASS: {len(results)} JPEGs decoded, six exact EXIF fields, dimensions and hashes independently verified')
