import urllib.request
import base64

url = "https://github.com/google/fonts/raw/main/ofl/sarabun/Sarabun-Regular.ttf"
try:
    response = urllib.request.urlopen(url)
    font_data = response.read()
    b64 = base64.b64encode(font_data).decode('utf-8')
    with open("fonts.js", "w") as f:
        f.write(f"window.THSarabunNewBase64 = '{b64}';\n")
    print("Success: fonts.js generated.")
except Exception as e:
    print(f"Error: {e}")
