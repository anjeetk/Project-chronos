import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# Simulate the problem
# 105 columns in shap_values, 108 columns in FEATURE_NAMES_FE
shap_values = np.random.rand(2000, 105)
FEATURE_NAMES_FE = [f"f{i}" for i in range(108)]

print(f"Testing fix: shap_values shape {shap_values.shape}, FEATURE_NAMES_FE len {len(FEATURE_NAMES_FE)}")

# Testing the logic I just added to the notebook
# --- J1 FIX ---
if shap_values.shape[1] < len(FEATURE_NAMES_FE):
    print(f"Warning: Dimension mismatch detected. Correcting...")
    current_feature_names = FEATURE_NAMES_FE[:shap_values.shape[1]]
else:
    current_feature_names = FEATURE_NAMES_FE

# This would have failed before
shap_df = pd.DataFrame(shap_values, columns=current_feature_names)
print(f"Success: shap_df columns: {len(shap_df.columns)}")

# --- J2 Rank Attribution FIX ---
mean_hi = np.abs(shap_values[:400]).mean(axis=0)
mean_lo = np.abs(shap_values[400:]).mean(axis=0)

rank_attr = pd.DataFrame({
    'feature'          : current_feature_names,
    'hi_priority_shap' : mean_hi,
    'lo_priority_shap' : mean_lo,
    'ratio'            : mean_hi / (mean_lo + 1e-9)
})
print(f"Success: Rank attribution df created with {len(rank_attr)} rows.")

# --- J3 Driver Stability FIX ---
feat_cols = FEATURE_NAMES_FE[:shap_values.shape[1]]
print(f"Success: feat_cols slice size is {len(feat_cols)}")

print("Test complete.")
