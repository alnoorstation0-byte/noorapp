import sys

with open('D:/waterapp/app/inventory/transactions/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("row.status === 'pending'", "['pending', '?????', '??? ????????'].includes(row.status)")
content = content.replace("row.status === 'approved'", "['approved', '?????', '????'].includes(row.status)")

with open('D:/waterapp/app/inventory/transactions/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
