import json
import os

notebook_path = 'c:/Users/anjee/Desktop/Project-chronos/chronos.ipynb'
with open(notebook_path, 'r', encoding='utf-8') as f:
    nb = json.load(f)

# Modify the title cell
for cell in nb['cells']:
    if cell['id'] == 'title-cell':
        cell['source'] = [
            "# 🧠 CHRONOS — ICU Risk Prediction Pipeline\n",
            "\n",
            "**Sections covered:**\n",
            "- D · Patient-level Splitting\n",
            "- E · Leakage-safe Preprocessing\n",
            "- F · Risk Modeling Layer\n",
            "- G · Validation Strategy\n",
            "- H · Clinical Utility Optimization\n",
            "- I · Novel Method Layer (Continuous Risk Trajectory)\n",
            "- J · Explainability (Temporal SHAP → Rank Attribution → Driver Stability)\n",
            "\n",
            "**Data source:** Local CSV `datasets_13339.csv`"
        ]
        break

# Modify the setup header
for cell in nb['cells']:
    if cell['id'] == 'setup-header':
        cell['source'] = [
            "---\n",
            "## 0 · Setup & Local Data Load"
        ]
        break

# Modify the setup cell
new_setup_source = [
    "# ── 0 · Setup & Load Local Data ───────────────────────────────────────────────\n",
    "import os, subprocess, sys\n",
    "import pandas as pd\n",
    "import numpy as np\n",
    "import warnings\n",
    "import matplotlib.pyplot as plt\n",
    "import seaborn as sns\n",
    "import joblib\n",
    "warnings.filterwarnings('ignore')\n",
    "\n",
    "# ── Install packages ─────────────────────────────────────────────────────────\n",
    "def _pip(*pkgs):\n",
    "    subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', *pkgs], check=True)\n",
    "\n",
    "_pip('xgboost', 'scikit-learn', 'lifelines', 'shap', 'matplotlib', 'seaborn', 'statsmodels', 'joblib')\n",
    "\n",
    "print('✅ Packages installed.')\n",
    "\n",
    "# ── Load dataset ─────────────────────────────────────────────────────────────\n",
    "CSV_PATH = 'datasets_13339.csv'\n",
    "\n",
    "if os.path.exists(CSV_PATH):\n",
    "    print(f'Loading data from {CSV_PATH}...')\n",
    "    df = pd.read_csv(CSV_PATH)\n",
    "    print(f'✅ Loaded {len(df):,} rows × {df.shape[1]} columns')\n",
    "    \n",
    "    # Ensure core datetime columns are converted\n",
    "    datetime_cols = ['prediction_time', 'intime', 'outtime', 'event_time_2h', 'event_time_6h', 'event_time_12h', 'event_time_2h_observed', 'event_time_6h_observed', 'event_time_12h_observed']\n",
    "    for col in datetime_cols:\n",
    "        if col in df.columns:\n",
    "            df[col] = pd.to_datetime(df[col], errors='coerce')\n",
    "\n",
    "    display(df.head(3))\n",
    "else:\n",
    "    print(f'❌ ERROR: {CSV_PATH} not found in current directory.')\n"
]

for cell in nb['cells']:
    if cell['id'] == 'cell-setup':
        cell['source'] = new_setup_source
        break

# Save the modified notebook
with open(notebook_path, 'w', encoding='utf-8') as f:
    json.dump(nb, f, indent=1)

print("Modification complete.")
