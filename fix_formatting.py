import json
import os

notebook_path = 'c:/Users/anjee/Desktop/Project-chronos/chronos.ipynb'
with open(notebook_path, 'r', encoding='utf-8') as f:
    nb = json.load(f)

for cell in nb['cells']:
    if cell.get('id') == 'cell-rank-attribution':
        source = cell['source']
        for i, line in enumerate(source):
            if "# Dimensionality guard for Rank Attribution" in line:
                source[i] = "rank_attr_dim = shap_values.shape[1] if 'shap_values' in locals() else len(FEATURE_NAMES_FE)\n"
                source[i+1] = "current_feature_names = FEATURE_NAMES_FE[:rank_attr_dim]\n"
            if "'feature'          : current_feature_names" in line:
                source[i] = "    'feature'          : current_feature_names,\n"
        break

for cell in nb['cells']:
    if cell.get('id') == 'cell-driver-stability':
        source = cell['source']
        for i, line in enumerate(source):
            if 'feat_cols = FEATURE_NAMES_FE[:shap_values.shape[1]]' in line:
                source[i] = "feat_cols = FEATURE_NAMES_FE[:shap_values.shape[1]]  # Dimensionality guard\n"
        break

with open(notebook_path, 'w', encoding='utf-8') as f:
    json.dump(nb, f, indent=1)

print("Fixed J2 and J3 code blocks without indentation errors.")
