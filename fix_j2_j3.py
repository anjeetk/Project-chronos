import json
import os

notebook_path = 'c:/Users/anjee/Desktop/Project-chronos/chronos.ipynb'
with open(notebook_path, 'r', encoding='utf-8') as f:
    nb = json.load(f)

for cell in nb['cells']:
    if cell.get('id') == 'cell-rank-attribution':
        source = cell['source']
        for i, line in enumerate(source):
            if "rank_attr = pd.DataFrame({" in line:
                source.insert(i, "    # Dimensionality guard for Rank Attribution\n")
                source.insert(i+1, "    current_feature_names = FEATURE_NAMES_FE[:shap_values.shape[1]]\n")
                break
        for i, line in enumerate(source):
            if "'feature'          : FEATURE_NAMES_FE," in line:
                source[i] = "    'feature'          : current_feature_names,\n"
                break
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

print("Fixed J2 and J3 code blocks.")
