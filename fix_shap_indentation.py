import json
import os

notebook_path = 'c:/Users/anjee/Desktop/Project-chronos/chronos.ipynb'
with open(notebook_path, 'r', encoding='utf-8') as f:
    nb = json.load(f)

# The previous script broke the indentation and didn't execute for single array outputs. Let's fix that block.
for cell in nb['cells']:
    if cell.get('id') == 'cell-shap-global':
        source = cell['source']
        
        # Look for where I injected earlier
        start_idx = -1
        end_idx = -1
        for i, line in enumerate(source):
            if "# shap_values is now always shape (n_samples, n_features)" in line:
                start_idx = i
            if "shap_df['stay_id']" in line:
                end_idx = i
                break
                
        if start_idx != -1 and end_idx != -1:
            new_block = [
                "# shap_values is now always shape (n_samples, n_features)\n",
                "\n",
                "# Dimensionality guard for SHAP DataFrame\n",
                "if shap_values.shape[1] < len(FEATURE_NAMES_FE):\n",
                "    print(f'\\u26a0\\ufe0f WARNING: Dimension mismatch. Masking FEATURE_NAMES_FE to match model outputs ({shap_values.shape[1]}/{len(FEATURE_NAMES_FE)})')\n",
                "    current_feature_names = FEATURE_NAMES_FE[:shap_values.shape[1]]\n",
                "else:\n",
                "    current_feature_names = FEATURE_NAMES_FE\n",
                "shap_df = pd.DataFrame(shap_values, columns=current_feature_names)\n"
            ]
            
            # Replace lines from start_idx to end_idx-1
            source[start_idx:end_idx] = new_block
            
print("Fixing the indentation issue in J1.")

# Save the modified notebook
with open(notebook_path, 'w', encoding='utf-8') as f:
    json.dump(nb, f, indent=1)
