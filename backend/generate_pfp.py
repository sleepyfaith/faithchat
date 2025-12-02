import hashlib
from PIL import Image, ImageDraw, ImageFont

def get_user_colours(uuid):
    h = hashlib.sha256(uuid.encode()).digest()
    r1, g1, b1, r2, g2, b2 = h[:6]

    color1 = (r1, g1, b1)
    color2 = (r2, g2, b2)

    print(h, color1, color2)

    return color1, color2

def pick_text_color(color1, color2):
    def brightness(rgb):
        r, g, b = rgb
        return 0.299*r + 0.587*g + 0.114*b
    
    avg = (brightness(color1) + brightness(color2)) / 2
    return "black" if avg > 50 else "white"

def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i]-c1[i])*t) for i in range(3))

def generate_user_pfp(uuid, size=128):
    color1, color2 = get_user_colours(uuid)
    text_color = pick_text_color(color1, color2)

    img = Image.new("RGB", (size, size))
    draw = ImageDraw.Draw(img)

    for y in range(size):
        ratio = y / (size-1)
        color = lerp_color(color1, color2, ratio)
        draw.line([(0, y), (size, y)], fill=color)
    
    font = ImageFont.truetype("fonts/Quicksand-Regular.ttf", int(size*0.5))
    text = ":3"
    
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]    

    draw.text(((size-w)/2, (size-h)/4), text, font=font, fill=text_color)
    
    return img
