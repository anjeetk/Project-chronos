import json

notebook_path = 'c:/Users/anjee/Desktop/Project-chronos/chronos.ipynb'
script_path = 'c:/Users/anjee/Desktop/Project-chronos/test_execute.py'

with open(notebook_path, 'r', encoding='utf-8') as f:
    nb = json.load(f)

# Extract python code
code = []
for cell in nb['cells']:
    if cell['cell_type'] == 'code':
        # Don't run the pip install cell otherwise tests take too long
        if 'subprocess.run([sys.executable' in "".join(cell['source']):
            # Still need to define variables set in the setup block
            code.append("import pandas as pd\nimport numpy as np\nimport warnings\nimport matplotlib.pyplot as plt\nimport seaborn as sns\nimport joblib\nwarnings.filterwarnings('ignore')\n")
            continue
        code.append("".join(cell['source']))

with open(script_path, 'w', encoding='utf-8') as f:
    f.write("\n\n".join(code))

print(f"Extracted to {script_path}")
