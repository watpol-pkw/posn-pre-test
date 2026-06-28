with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the incorrectly inserted block from 251 to 340 (between home-upcoming and view-sd-enroll)
start_marker = "    <!-- AD-SUBJ-SCORES (V1.6.1) -->"
end_marker = "    <!-- SD-ENROLL -->"
start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + content[end_idx:]

# Put back the missing announcement div
ann_missing = """          <div id="home-announcement" class="text-slate-700 text-lg leading-relaxed whitespace-pre-wrap font-medium">ไม่มีประกาศ</div>
        </div>
      </div>
"""
if 'id="home-announcement"' not in content:
    # find where to insert
    insert_marker = "            ประกาศ\n          </h3>\n"
    ins_idx = content.find(insert_marker)
    if ins_idx != -1:
        content = content[:ins_idx + len(insert_marker)] + ann_missing + content[ins_idx + len(insert_marker):]

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fix script completed.")
