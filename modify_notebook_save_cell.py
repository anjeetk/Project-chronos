import json
import os

notebook_path = 'c:/Users/anjee/Desktop/Project-chronos/chronos.ipynb'
with open(notebook_path, 'r', encoding='utf-8') as f:
    nb = json.load(f)

# Modify the save models cell
save_models_source = [
    "# ── F2-Save · Persist models + preprocessing objects ─────────────────────────\n",
    "import joblib, os\n",
    "\n",
    "SAVE_DIR = 'chronos_models'\n",
    "os.makedirs(SAVE_DIR, exist_ok=True)\n",
    "\n",
    "joblib.dump(imputer,          f'{SAVE_DIR}/imputer.pkl')\n",
    "joblib.dump(scaler,           f'{SAVE_DIR}/scaler.pkl')\n",
    "joblib.dump(xgb_models,       f'{SAVE_DIR}/xgb_models.pkl')\n",
    "joblib.dump(FEATURE_COLS,     f'{SAVE_DIR}/feature_cols.pkl')\n",
    "joblib.dump(HIGH_MISS_COLS,   f'{SAVE_DIR}/high_miss_cols.pkl')\n",
    "joblib.dump(FEATURE_NAMES_FE, f'{SAVE_DIR}/feature_names_fe.pkl')\n",
    "\n",
    "print(f'✅ Models saved to {SAVE_DIR}/')\n",
    "print('   Files: imputer.pkl  scaler.pkl  xgb_models.pkl')\n",
    "print('   Files: feature_cols.pkl  high_miss_cols.pkl  feature_names_fe.pkl')\n"
]

found = False
for cell in nb['cells']:
    if cell.get('id') == 'cell-save-models':
        cell['source'] = save_models_source
        found = True
        break

if not found:
    # Try searching for it by content if ID changed or is missing
    for cell in nb['cells']:
        if cell['cell_type'] == 'code' and any('cell-save-models' in line or 'F2-Save' in line for line in cell['source']):
            cell['source'] = save_models_source
            break

# Save the modified notebook
with open(notebook_path, 'w', encoding='utf-8') as f:
    json.dump(nb, f, indent=1)

print("Modification of save cell complete.")
