import pandas as pd
df = pd.read_csv('c:/Users/anjee/Desktop/Project-chronos/datasets_13339.csv', nrows=1)
cols = df.columns.tolist()
required_cols = [
    'subject_id','hadm_id','stay_id','patient_split_bucket','prediction_time',
    'race','gender','first_careunit','admission_type','hospital_expire_flag',
    'label_12h'
]
missing = [c for c in required_cols if c not in cols]
print(f"Required columns check: {len(missing)} missing.")
if missing:
    print(f"Missing: {missing}")
else:
    print("All core columns present.")

# Check for variant names like patient_split_bu...
if 'patient_split_bucket' not in cols:
    print("Checking for similar names to patient_split_bucket:")
    print([c for c in cols if 'patient_split' in c])
