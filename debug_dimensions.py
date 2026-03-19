import pandas as pd
df = pd.read_csv('c:/Users/anjee/Desktop/Project-chronos/datasets_13339.csv')
train_df = df[df['patient_split_bucket'] < 70]
FEATURE_COLS = [
    'anchor_age',
    'hr','map_mean','sbp','dbp','rr','spo2','temp_c','pulse_pressure',
    'gcs_total','fio2_frac','pao2','paco2_abg','ph_abg','pf_ratio','sf_ratio',
    'vent_active','vasopressor_active','ne_equivalent_dose','crrt_active',
    'lactate','creatinine','platelets','bilirubin_total','wbc',
    'sodium','potassium','bicarbonate','hemoglobin','glucose',
    'urine_ml','urine_ml_per_kg','body_weight_kg',
    'sofa_resp','sofa_coag','sofa_liver','sofa_renal','sofa_cardio','sofa_cns','sofa_approx',
    'shock_index','delta_sofa_6h','ards_flag','aki_stage','aki_stage_creat','aki_stage_uo',
    'hours_since_admission','hours_since_infection',
    'charlson_comorbidity_index','oasis','oasis_prob','sapsii','sapsii_prob',
    'hr_mean_12h','hr_std_12h','map_min_12h','map_mean_12h',
    'lactate_max_12h','creatinine_max_12h','platelets_min_12h','bilirubin_max_12h',
    'urine_sum_12h','urine_per_kg_sum_12h','vasopressor_any_12h','ne_dose_mean_12h',
    'vent_any_12h','sofa_max_12h','delta_sofa_mean_12h','aki_stage_max_12h',
    'pf_ratio_min_12h','sf_ratio_min_12h','shock_index_max_12h','observed_hours_in_window'
]
FEATURE_COLS = [c for c in FEATURE_COLS if c in df.columns]
miss_rates = train_df[FEATURE_COLS].isnull().mean()
high_miss = miss_rates[miss_rates > 0.20]
print(f"High miss columns count: {len(high_miss)}")
print(f"Total features (base + high miss): {len(FEATURE_COLS) + len(high_miss)}")
