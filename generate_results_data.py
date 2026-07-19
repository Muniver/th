import json
from pathlib import Path
from openpyxl import load_workbook

p = Path('data.xlsx')
wb = load_workbook(p, data_only=True, read_only=True)
ws = wb['النظام الجديد']
rows = list(ws.iter_rows(values_only=True))
header = list(rows[0])
data = []
for r in rows[1:]:
    seat = r[0]
    name = r[1]
    score = float(r[2]) if r[2] is not None else None
    status = 'ناجح' if score is not None and score >= 100 else 'راسب'
    data.append([seat, name, score, status, 1])

out = Path('data/results.js')
out.write_text('window.RESULTS_DATA_ROWS = ' + json.dumps([header] + data, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
print('wrote', out, 'rows', len(data))
