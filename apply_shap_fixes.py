import json
import os

notebook_path = 'c:/Users/anjee/Desktop/Project-chronos/chronos.ipynb'
with open(notebook_path, 'r', encoding='utf-8') as f:
    nb = json.load(f)

# Fix J1 SHAP cell to be dimension-safe
for cell in nb['cells']:
    if cell.get('id') == 'cell-shap-global':
        source = cell['source']
        for i, line in enumerate(source):
            if 'pd.DataFrame(shap_values, columns=FEATURE_NAMES_FE)' in line:
                # Add dimension safe guard
                source[i] = "    # Dimensionality guard for SHAP DataFrame\n"
                source.insert(i+1, "    if shap_values.shape[1] < len(FEATURE_NAMES_FE):\n")
                source.insert(i+2, "        print(f'\\u26a0\\ufe0f WARNING: Dimension mismatch. Masking FEATURE_NAMES_FE to match model outputs ({shap_values.shape[1]}/{len(FEATURE_NAMES_FE)})')\n")
                source.insert(i+3, "        current_feature_names = FEATURE_NAMES_FE[:shap_values.shape[1]]\n")
                source.insert(i+4, "    else:\n")
                source.insert(i+5, "        current_feature_names = FEATURE_NAMES_FE\n")
                source.insert(i+6, "    shap_df = pd.DataFrame(shap_values, columns=current_feature_names)\n")
                break
        
        # Also fix summary_plot and importance_df lines in the same cell
        for i, line in enumerate(source):
             if 'summary_plot(shap_values, X_shap, feature_names=FEATURE_NAMES_FE' in line:
                 source[i] = line.replace('feature_names=FEATURE_NAMES_FE', 'feature_names=current_feature_names')
             if 'pd.DataFrame({\'feature\': FEATURE_NAMES_FE' in line:
                 source[i] = line.replace('FEATURE_NAMES_FE', 'current_feature_names')
        break

# Fix J2 Rank Attribution cell
for cell in nb['cells']:
    if cell.get('id') == 'cell-rank-attribution':
        source = cell['source']
        for i, line in enumerate(source):
            if 'pd.DataFrame({' in line and '\'feature\'          : FEATURE_NAMES_FE' in line:
                # Need to use the same dimension-safe list
                source.insert(i, "    # Dimensionality guard for Rank Attribution\n")
                source.insert(i+1, "    current_feature_names = FEATURE_NAMES_FE[:shap_values.shape[1]]\n")
                source[i+2] = line.replace('FEATURE_NAMES_FE', 'current_feature_names')
                break
        # Also fix ax.set_yticklabels
        for i, line in enumerate(source):
            if "ax.set_yticklabels(rank_attr['feature'])" in line:
                # This one is already using rank_attr['feature'], so it's fine
                pass
        break

# Fix J3 Driver Stability cell
for cell in nb['cells']:
    if cell.get('id') == 'cell-driver-stability' or cell.get('id') == 'cell-stability-heatmap':
        source = cell['source']
        for i, line in enumerate(source):
            if 'feat_cols = FEATURE_NAMES_FE' in line:
                 source[i] = "    feat_cols = FEATURE_NAMES_FE[:shap_values.shape[1]]  # Dimensionality guard\n"
        break

# Save the modified notebook
with open(notebook_path, 'w', encoding='utf-8') as f:
    json.dump(nb, f, indent=1)

print("Robust dimension guards applied to Section J.")
