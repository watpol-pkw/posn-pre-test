import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract CSS
style_match = re.search(r'<style>(.*?)</style>', content, flags=re.DOTALL)
if style_match:
    with open('style.css', 'w', encoding='utf-8') as f:
        f.write(style_match.group(1).strip() + '\n')
    content = content[:style_match.start()] + '<link rel="stylesheet" href="style.css">' + content[style_match.end():]

# Extract JS
script_match = re.search(r'<script>(.*?)</script>', content, flags=re.DOTALL)
if script_match:
    with open('script.js', 'w', encoding='utf-8') as f:
        f.write(script_match.group(1).strip() + '\n')
    content = content[:script_match.start()] + '<script src="script.js"></script>' + content[script_match.end():]

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Splitting complete.")
