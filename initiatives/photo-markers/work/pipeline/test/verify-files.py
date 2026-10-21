"""Native Pillow oracle; imports no application serializer, resolver or reader."""
import hashlib, json, pathlib
import PIL
from PIL import Image, JpegImagePlugin

root = pathlib.Path(__file__).resolve().parent.parent
receipt = json.loads((root/'evidence/browser.json').read_text())
expected_times = {
    'date': ('2026:10:21 00:00:00', '+10:00'),
    'now': ('2026:10:21 00:05:06', '+10:00'),
    'seconds': ('2026:10:21 12:34:56', '+00:00'),
    'half': ('2026:10:21 00:00:00', '+05:30'),
    'quarter': ('2026:10:21 00:00:00', '+05:45'),
    'earlier': ('2026:11:01 01:30:00', '-07:00'),
    'later': ('2026:11:01 01:30:00', '-08:00'),
    'lower': ('1900:01:01 00:00:00', '+00:00'),
    'upper': ('2099:12:31 00:00:00', '+00:00'),
}
results = []
for engine in receipt['engines']:
    assert engine['pass'], engine.get('error')
    for row in engine['suite']['records']:
        filename = f"{engine['engine']}-{row['id']}.jpg"
        blob = (root/'evidence'/filename).read_bytes()
        assert hashlib.sha256(blob).hexdigest() == row['sha256']
        local, offset = expected_times.get(row['id'], ('2026:10:21 00:05:06', '+10:00'))
        with Image.open(root/'evidence'/filename) as image:
            image.load()
            assert image.format == 'JPEG'
            assert image.size == (row['settings']['size'],)*2
            assert JpegImagePlugin.get_sampling(image) == 0
            tags = image.getexif()
            nested = tags.get_ifd(34665)
            assert tags[305] == 'Photo markers'
            assert tags[306] == local
            for key in (36867, 36868): assert nested[key] == local
            for key in (36880, 36881, 36882): assert nested[key] == offset
            size = image.width
            samples = []
            if row['id'].startswith(('donut-', 'star-', 'solid-')):
                points = [((0, 0), (0, 0, 0))]
                if row['settings']['shape'] == 'donut':
                    points += [((size//2, size//20), (255,0,0)), ((size//2, size//2), (182,215,168))]
                elif row['settings']['shape'] == 'star':
                    points += [((size//2, size//2), (255,0,0))]
                for point, expected in points:
                    pixel = image.convert('RGB').getpixel(point)
                    assert max(abs(a-b) for a,b in zip(pixel, expected)) <= 12, (filename, point, pixel)
                    samples.append({'point':point, 'pixel':pixel})
            if row['id'] == 'local-otf':
                # Fixture A is a filled triangle, unlike a fallback font's A.
                assert max(image.convert('RGB').getpixel((size//2,size//2))) <= 12
            results.append({'file':filename, 'size':image.size, 'sha256':row['sha256'], 'local':local, 'offset':offset, 'samples':samples, 'pass':True})
assert len(results) == 52, len(results)
(root/'evidence/independent-files.json').write_text(json.dumps({'oracle':'native Pillow','version':PIL.__version__,'results':results},indent=2)+'\n')
print(f'PASS: {len(results)} decoded JPEGs, 4:4:4, exact EXIF, shapes and local OTF pixels')
