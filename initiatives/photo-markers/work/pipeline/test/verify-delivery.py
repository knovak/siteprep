"""Native image/EXIF checks of the actual desktop-delivery downloads."""
import json,hashlib,pathlib,zipfile,io
import PIL
from PIL import Image
root=pathlib.Path(__file__).resolve().parent.parent/'evidence/delivery'
receipt=json.loads((root/'browser.json').read_text())
assert all(r['pass'] for r in receipt['engines'])
results=[]
files=list(receipt['files'])
if (root/'safari-native.json').exists():files += json.loads((root/'safari-native.json').read_text())['files']
for row in files:
    if 'archive' in row:
        with zipfile.ZipFile(root/row['archive']) as archive:data=archive.read(row['member'])
    else:data=(root/row['file']).read_bytes()
    assert hashlib.sha256(data).hexdigest()==row['sha256']
    with Image.open(io.BytesIO(data)) as image:
        image.load();assert image.format=='JPEG' and image.size==(row['size'],)*2
        tags=image.getexif();nested=tags.get_ifd(34665)
        assert tags[306]==row['local'] and tags[305]=='Photo markers'
        for key in (36867,36868):assert nested[key]==row['local']
        for key in (36880,36881,36882):assert nested[key]==row['offset']
    results.append(row)
(root/'independent-files.json').write_text(json.dumps({'oracle':'Pillow','version':PIL.__version__,'files':results},indent=2)+'\n')
print(f'PASS: {len(results)} downloaded JPEGs, hashes, dimensions and six exact EXIF fields')
