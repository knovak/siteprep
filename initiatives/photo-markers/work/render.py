import io, json, math
import PIL
from PIL import Image, ImageDraw, ImageFont

def render(settings):
    s = json.loads(settings)
    side = s['size']
    image = Image.new('RGB', (side, side), s['background'])
    draw = ImageDraw.Draw(image)
    if s['shape'] == 'donut':
        draw.ellipse((0, 0, side, side), fill=s['shapeColor'])
        r = side * .39
        draw.ellipse((side/2-r, side/2-r, side/2+r, side/2+r), fill=s['center'])
    elif s['shape'] == 'star':
        points = []
        for i in range(10):
            r = side/2 * (1 if i % 2 == 0 else .45)
            angle = -math.pi/2 + i * math.pi/5
            points.append((side/2 + r*math.cos(angle), side/2 + r*math.sin(angle)))
        draw.polygon(points, fill=s['shapeColor'])
    if s['title']:
        bw, bh = {'donut': (.6084, .3042), 'star': (.6, .25), 'solid': (.78, .30)}[s['shape']]
        low, high, chosen = 4, side, None
        while low <= high:
            size = (low+high)//2
            candidate = ImageFont.truetype('/font.ttf', size)
            outline = max(1, math.floor(size * .045))
            bounds = draw.textbbox((0, 0), s['title'], font=candidate, stroke_width=outline)
            if bounds[2]-bounds[0] <= side*bw and bounds[3]-bounds[1] <= side*bh:
                chosen = (candidate, outline, bounds)
                low = size + 1
            else:
                high = size - 1
        if chosen is None:
            raise ValueError('Title cannot fit')
        font, stroke, box = chosen
        x = (side - (box[2]-box[0]))/2 - box[0]
        y = (side - (box[3]-box[1]))/2 - box[1]
        draw.text((x, y), s['title'], font=font, fill=s['text'], stroke_width=stroke, stroke_fill=s['outline'])
    metadata = Image.Exif()
    metadata[305] = 'Photo markers comparison'
    metadata[306] = s['local']
    metadata[34665] = {36867: s['local'], 36868: s['local'], 36880: s['offset'], 36881: s['offset'], 36882: s['offset']}
    output = io.BytesIO()
    image.save(output, format='JPEG', quality=95, subsampling=0, exif=metadata)
    return output.getvalue()
