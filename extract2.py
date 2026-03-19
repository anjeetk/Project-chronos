import json
notebook_path = 'c:/Users/anjee/Desktop/Project-chronos/chronos.ipynb'
script_path = 'c:/Users/anjee/Desktop/Project-chronos/test_execute2.py'

with open(notebook_path, 'r', encoding='utf-8') as f:
    nb = json.load(f)

code = []
for cell in nb['cells']:
    if cell['cell_type'] == 'code':
        source = "".join(cell['source'])
        # Comment out pip install and IPython display functions
        source = source.replace("_pip('xgboost'", "#_pip('xgboost'")
        source = source.replace("display(", "print(")
        code.append(source)

with open(script_path, 'w', encoding='utf-8') as f:
    f.write("\n\n".join(code))
