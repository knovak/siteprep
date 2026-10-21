"""Native Pillow verification of files actually retrieved through the editor."""
import hashlib, json, pathlib
import PIL
from PIL import Image
root = pathlib.Path(__file__).resolve().parent.parent / 'evidence/editor'
receipt = json.loads((root/'browser.json').read_text())
assert all(row['pass'] for row in receipt['engines'])
results = []
for row in receipt['files']:
    path = root / row['file']
    assert hashlib.sha256(path.read_bytes()).hexdigest() == row['sha256']
    with Image.open(path) as image:
        image.load()
        assert image.format == 'JPEG' and image.size == (row['size'],)*2
        tags = image.getexif(); nested = tags.get_ifd(34665)
        assert tags[306] == row['local'] and tags[305] == 'Photo markers'
        for key in (36867,36868): assert nested[key] == row['local']
        for key in (36880,36881,36882): assert nested[key] == row['offset']
        for sample in row['preview']:
            x,y = sample['point']
            expected = image.convert('RGB').getpixel((int((x+.5)*image.width/420), int((y+.5)*image.height/420)))
            # Independent decoder rounding may differ by one channel level.
            assert max(abs(a-b) for a,b in zip(sample['pixel'][:3], expected)) <= 2, (row['file'], sample, expected)
        results.append({'file':row['file'],'sha256':row['sha256'],'local':row['local'],'offset':row['offset'],'previewMatches':True})
(root/'independent-files.json').write_text(json.dumps({'oracle':'native Pillow','version':PIL.__version__,'results':results},indent=2)+'\n')
print(f'PASS: {len(results)} retrieved JPEGs, six exact EXIF fields, dimensions, hashes and decoded-preview pixels')
