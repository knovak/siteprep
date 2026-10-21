"""External oracle: native Pillow decodes extracted JPEGs and reads TIFF tags.

This never imports the browser metadata writer or exifr reader.
"""
import hashlib, io, json, pathlib, zipfile
import PIL
from PIL import Image

root = pathlib.Path(__file__).resolve().parent.parent
results = []
for path in sorted((root / 'evidence').glob('*-batch.zip')):
    with zipfile.ZipFile(path) as archive:
        manifest = json.loads(archive.read('manifest.json'))
        assert len(manifest) == 10
        for row in manifest:
            blob = archive.read(row['filename'])
            assert hashlib.sha256(blob).hexdigest() == row['sha256']
            with Image.open(io.BytesIO(blob)) as image:
                image.load()
                assert image.format == 'JPEG' and image.size == (2000, 2000)
                exif = image.getexif()
                nested = exif.get_ifd(34665)
                s = row['settings']
                actual = {str(tag): exif.get(tag) for tag in (305, 306)}
                actual.update({str(tag): nested.get(tag) for tag in (36867, 36868, 36880, 36881, 36882)})
                assert actual['305'] == 'Photo markers comparison'
                for tag in ('306', '36867', '36868'):
                    assert actual[tag] == s['local'], (path, row['filename'], tag, actual)
                for tag in ('36880', '36881', '36882'):
                    assert actual[tag] == s['offset']
                # JPEG interiors away from antialiasing and text; tolerance 12 RGB.
                expected = {'donut': ((1000, 100), (255, 0, 0)), 'star': ((1000, 100), (255, 0, 0)), 'solid': ((100, 100), (0, 0, 0))}
                point, rgb = expected[s['shape']]
                pixel = image.convert('RGB').getpixel(point)
                assert max(abs(a-b) for a, b in zip(pixel, rgb)) <= 12, (path, row['filename'], pixel)
                results.append({'archive': path.name, 'filename': row['filename'], 'bytes': len(blob), 'sha256': row['sha256'], 'size': list(image.size), 'tags': actual, 'interiorPixel': list(pixel), 'pass': True})
assert len(results) == 40, f'Expected four ten-row archives, got {len(results)}'
output = {'oracle': 'native Pillow', 'version': PIL.__version__, 'results': results}
(root / 'evidence' / 'independent-files.json').write_text(json.dumps(output, indent=2)+'\n')
print(f'PASS: {len(results)} independently decoded JPEGs, six timestamp/offset tags, software, interior pixel and ZIP hashes')
