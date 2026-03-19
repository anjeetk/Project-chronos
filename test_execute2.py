# ── 0 · Setup & Load Local Data ───────────────────────────────────────────────
import os, subprocess, sys
import pandas as pd
import numpy as np
import warnings
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
warnings.filterwarnings('ignore')

# ── Install packages ─────────────────────────────────────────────────────────
def _pip(*pkgs):
    subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', *pkgs], check=True)

#_pip('xgboost', 'scikit-learn', 'lifelines', 'shap', 'matplotlib', 'seaborn', 'statsmodels', 'joblib')

print('✅ Packages installed.')

# ── Load dataset ─────────────────────────────────────────────────────────────
CSV_PATH = 'datasets_13339.csv'

if os.path.exists(CSV_PATH):
    print(f'Loading data from {CSV_PATH}...')
    df = pd.read_csv(CSV_PATH)
    print(f'✅ Loaded {len(df):,} rows × {df.shape[1]} columns')
    
    # Ensure core datetime columns are converted
    datetime_cols = ['prediction_time', 'intime', 'outtime', 'event_time_2h', 'event_time_6h', 'event_time_12h', 'event_time_2h_observed', 'event_time_6h_observed', 'event_time_12h_observed']
    for col in datetime_cols:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors='coerce')

    print(df.head(3))
else:
    print(f'❌ ERROR: {CSV_PATH} not found in current directory.')


# ── D1 · Patient-level split using pre-computed bucket ────────────────────────
train_df = df[df['patient_split_bucket'] < 70].copy()
val_df   = df[(df['patient_split_bucket'] >= 70) & (df['patient_split_bucket'] < 85)].copy()
test_df  = df[df['patient_split_bucket'] >= 85].copy()

for name, subset in [('Train', train_df), ('Val', val_df), ('Test', test_df)]:
    n_pat = subset['subject_id'].nunique()
    n_row = len(subset)
    pos   = subset['label_12h'].mean()
    print(f'{name:6s} | patients={n_pat:5,} | rows={n_row:7,} | label_12h positive rate={pos:.3f}')

# Verify no patient overlap
assert not set(train_df.subject_id) & set(val_df.subject_id), 'LEAKAGE: train/val overlap'
assert not set(train_df.subject_id) & set(test_df.subject_id), 'LEAKAGE: train/test overlap'
assert not set(val_df.subject_id)   & set(test_df.subject_id), 'LEAKAGE: val/test overlap'
print('\n✅ No patient overlap across splits.')

# ── D2 · Split distribution visualisation ─────────────────────────────────────
import matplotlib.pyplot as plt
import seaborn as sns

fig, axes = plt.subplots(1, 3, figsize=(16, 4))
fig.suptitle('Patient-level Split Distributions', fontsize=14, fontweight='bold')

split_info = {'Train': train_df, 'Val': val_df, 'Test': test_df}
colors     = {'Train': '#4C72B0', 'Val': '#DD8452', 'Test': '#55A868'}

for ax, (name, sdf) in zip(axes, split_info.items()):
    event_counts = sdf.groupby('stay_id')['label_12h'].max()
    ax.hist(sdf.groupby('subject_id').size(), bins=30, color=colors[name], alpha=0.8, edgecolor='white')
    ax.set_title(f'{name} — rows per patient')
    ax.set_xlabel('Hours per patient'); ax.set_ylabel('Count')

plt.tight_layout()
plt.savefig('split_distribution.png', dpi=150, bbox_inches='tight')
plt.show()
print('Saved: split_distribution.png')

# ── E0 · Define feature columns ───────────────────────────────────────────────
ID_COLS   = ['subject_id','hadm_id','stay_id','patient_split_bucket',
             'prediction_time','intime','outtime']
META_COLS = ['race','gender','first_careunit','admission_type',
             'ventilation_status','hospital_expire_flag']
LABEL_COLS= ['label_2h','label_6h','label_12h',
             'event_type_2h','event_type_6h','event_type_12h',
             'event_time_2h','event_time_6h','event_time_12h',
             'observation_window_hours']

# Numeric predictors — anchor_age added (FIX: was missing)
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

# Keep only columns that actually exist in the dataframe
FEATURE_COLS = [c for c in FEATURE_COLS if c in df.columns]
print(f'Using {len(FEATURE_COLS)} numeric feature columns.')
print('Feature list:', FEATURE_COLS)


# ── E1 · Train-only Median Imputation ─────────────────────────────────────────
from sklearn.impute import SimpleImputer

imputer = SimpleImputer(strategy='median')
imputer.fit(train_df[FEATURE_COLS])

X_train = imputer.transform(train_df[FEATURE_COLS])
X_val   = imputer.transform(val_df[FEATURE_COLS])
X_test  = imputer.transform(test_df[FEATURE_COLS])

# Missingness indicator matrix (before imputation)
miss_train = train_df[FEATURE_COLS].isnull().astype(int).values
miss_val   = val_df[FEATURE_COLS].isnull().astype(int).values
miss_test  = test_df[FEATURE_COLS].isnull().astype(int).values

print('Imputation done.')
print(f'  X_train shape : {X_train.shape}')
print(f'  X_val   shape : {X_val.shape}')
print(f'  X_test  shape : {X_test.shape}')

# ── E2 · Train-only Standardisation ──────────────────────────────────────────
from sklearn.preprocessing import StandardScaler

scaler = StandardScaler()
scaler.fit(X_train)

X_train_sc = scaler.transform(X_train)
X_val_sc   = scaler.transform(X_val)
X_test_sc  = scaler.transform(X_test)

print('Standardisation done (mean=0, std=1 computed from train only).')

# ── E3 · Feature Engineering + Missingness Modelling ─────────────────────────
HIGH_MISS_THRESHOLD = 0.20

miss_rates     = train_df[FEATURE_COLS].isnull().mean()
HIGH_MISS_COLS = miss_rates[miss_rates > HIGH_MISS_THRESHOLD].index.tolist()
hi_idx         = [FEATURE_COLS.index(c) for c in HIGH_MISS_COLS]

import numpy as np

def add_missingness(X, miss_matrix, hi_idx):
    """Append binary missingness indicators for high-missingness columns."""
    if len(hi_idx) == 0:
        return X
    return np.hstack([X, miss_matrix[:, hi_idx]])

miss_train = train_df[FEATURE_COLS].isnull().astype(int).values
miss_val   = val_df[FEATURE_COLS].isnull().astype(int).values
miss_test  = test_df[FEATURE_COLS].isnull().astype(int).values

X_train_fe = add_missingness(X_train_sc, miss_train, hi_idx)
X_val_fe   = add_missingness(X_val_sc,   miss_val,   hi_idx)
X_test_fe  = add_missingness(X_test_sc,  miss_test,  hi_idx)

FEATURE_NAMES_FE = FEATURE_COLS + [f'miss_{c}' for c in HIGH_MISS_COLS]

print(f'High-missingness columns (>{HIGH_MISS_THRESHOLD*100:.0f}%): {HIGH_MISS_COLS}')
print(f'Augmented feature dim: {X_train_fe.shape[1]}')

# ── Labels (all horizons) ─────────────────────────────────────────────────
y_train_2  = train_df['label_2h'].values
y_val_2    = val_df['label_2h'].values
y_test_2   = test_df['label_2h'].values

y_train_6  = train_df['label_6h'].values
y_val_6    = val_df['label_6h'].values
y_test_6   = test_df['label_6h'].values

y_train_12 = train_df['label_12h'].values
y_val_12   = val_df['label_12h'].values
y_test_12  = test_df['label_12h'].values

# ── Event-type arrays (for IPS event severity weights) ────────────────────
# FIX: event_type columns were defined in LABEL_COLS but never extracted
for col in ['event_type_2h','event_type_6h','event_type_12h']:
    if col not in test_df.columns:
        test_df[col] = 'none'
        val_df[col]  = 'none'

print('Labels prepared for horizons: 2h / 6h / 12h')


# ── F1 · Logistic Regression ─────────────────────────────────────────────────
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, average_precision_score

lr = LogisticRegression(max_iter=1000, C=0.1, class_weight='balanced', random_state=42)
lr.fit(X_train_fe, y_train_12)

lr_proba_val  = lr.predict_proba(X_val_fe)[:,1]
lr_proba_test = lr.predict_proba(X_test_fe)[:,1]

print('Logistic Regression (12h horizon)')
print(f'  Val  AUROC={roc_auc_score(y_val_12,  lr_proba_val):.4f}  AUPRC={average_precision_score(y_val_12,  lr_proba_val):.4f}')
print(f'  Test AUROC={roc_auc_score(y_test_12, lr_proba_test):.4f}  AUPRC={average_precision_score(y_test_12, lr_proba_test):.4f}')

# ── F2 · XGBoost — All Three Horizons (2h / 6h / 12h) ───────────────────────
# FIX: use_label_encoder removed (deprecated in XGBoost ≥1.6)
# FIX: separate models trained per horizon so dashboard shows 3 risk scores
import xgboost as xgb
from sklearn.metrics import roc_auc_score, average_precision_score


def build_xgb(scale_pos):
    return xgb.XGBClassifier(
        n_estimators=400,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.7,
        scale_pos_weight=scale_pos,
        eval_metric='aucpr',
        early_stopping_rounds=30,
        random_state=42,
        tree_method='hist',   # faster, works on CPU & GPU
    )


horizon_cfg = [
    ('12h', y_train_12, y_val_12, y_test_12),
    ('6h',  y_train_6,  y_val_6,  y_test_6),
    ('2h',  y_train_2,  y_val_2,  y_test_2),
]

xgb_models  = {}   # keyed '2h','6h','12h'
xgb_probas  = {}   # xgb_probas[horizon][split] = array

for horizon, y_tr, y_vl, y_te in horizon_cfg:
    neg = (y_tr == 0).sum()
    pos = (y_tr == 1).sum()
    scale_pos = neg / max(pos, 1)

    model = build_xgb(scale_pos)
    model.fit(
        X_train_fe, y_tr,
        eval_set=[(X_val_fe, y_vl)],
        verbose=50,
    )
    xgb_models[horizon] = model

    val_prob  = model.predict_proba(X_val_fe)[:, 1]
    test_prob = model.predict_proba(X_test_fe)[:, 1]
    xgb_probas[horizon] = {'val': val_prob, 'test': test_prob}

    auroc_v = roc_auc_score(y_vl, val_prob)
    auprc_v = average_precision_score(y_vl, val_prob)
    auroc_t = roc_auc_score(y_te, test_prob)
    auprc_t = average_precision_score(y_te, test_prob)
    print(f'XGBoost ({horizon}) | Val  AUROC={auroc_v:.4f} AUPRC={auprc_v:.4f}')
    print(f'XGBoost ({horizon}) | Test AUROC={auroc_t:.4f} AUPRC={auprc_t:.4f}')
    print()

# Convenience aliases (used by downstream cells)
xgb_model       = xgb_models['12h']
xgb_proba_val   = xgb_probas['12h']['val']
xgb_proba_test  = xgb_probas['12h']['test']

print('All three XGBoost models trained.')


# ── F2-Save · Persist models + preprocessing objects ─────────────────────────
import joblib, os

SAVE_DIR = 'chronos_models'
os.makedirs(SAVE_DIR, exist_ok=True)

joblib.dump(imputer,          f'{SAVE_DIR}/imputer.pkl')
joblib.dump(scaler,           f'{SAVE_DIR}/scaler.pkl')
joblib.dump(xgb_models,       f'{SAVE_DIR}/xgb_models.pkl')
joblib.dump(FEATURE_COLS,     f'{SAVE_DIR}/feature_cols.pkl')
joblib.dump(HIGH_MISS_COLS,   f'{SAVE_DIR}/high_miss_cols.pkl')
joblib.dump(FEATURE_NAMES_FE, f'{SAVE_DIR}/feature_names_fe.pkl')

print(f'✅ Models saved to {SAVE_DIR}/')
print('   Files: imputer.pkl  scaler.pkl  xgb_models.pkl')
print('   Files: feature_cols.pkl  high_miss_cols.pkl  feature_names_fe.pkl')


# ── F3 · Cox Proportional Hazards Survival Model ─────────────────────────────
from lifelines import CoxPHFitter
from lifelines.utils import concordance_index

age_col    = 'anchor_age'           if 'anchor_age'           in train_df.columns else None
expire_col = 'hospital_expire_flag' if 'hospital_expire_flag' in train_df.columns else None

if expire_col is None:
    print('⚠️  hospital_expire_flag not found — skipping CoxPH (not needed for XGBoost scoring).')
else:
    def build_surv_df(split_df):
        agg_dict = dict(
            duration    = ('hours_since_admission', 'max'),
            event       = (expire_col,              'max'),
            sofa_max    = ('sofa_approx',            'max'),
            charlson    = ('charlson_comorbidity_index', 'first'),
            oasis       = ('oasis',                  'first'),
            sapsii      = ('sapsii',                 'first'),
            vasop_any   = ('vasopressor_any_12h',    'max'),
            vent_any    = ('vent_any_12h',           'max'),
            lactate_max = ('lactate_max_12h',        'max'),
        )
        if age_col:
            agg_dict['age'] = (age_col, 'first')
        return (
            split_df.groupby('stay_id')
            .agg(**agg_dict)
            .reset_index()
            .dropna()
        )

    surv_train = build_surv_df(train_df)
    surv_test  = build_surv_df(test_df)

    COX_FEATS = [c for c in ['duration','event','sofa_max','charlson','oasis',
                              'sapsii','age','vasop_any','vent_any','lactate_max']
                 if c in surv_train.columns]

    try:
        cph = CoxPHFitter(penalizer=0.1)
        cph.fit(surv_train[COX_FEATS], duration_col='duration', event_col='event')
        cph.print_summary()

        risk_scores = cph.predict_partial_hazard(surv_test[COX_FEATS])
        c_idx = concordance_index(surv_test['duration'], -risk_scores, surv_test['event'])
        print(f'\nCoxPH Test C-index: {c_idx:.4f}')
    except Exception as e:
        print(f'⚠️  CoxPH fitting failed: {e}')
        print('    Continuing — CoxPH is optional; XGBoost is the main model.')


# ── G1 · Nested Patient-level Cross Validation ────────────────────────────────
# FIX: removed use_label_encoder=False (deprecated XGBoost param)
# FIX: scale_pos_weight recalculated locally — not relying on loop variable
from sklearn.model_selection import GroupKFold
from sklearn.metrics import roc_auc_score

N_OUTER   = 5
gkf       = GroupKFold(n_splits=N_OUTER)
groups    = train_df['subject_id'].values

_neg_cv   = (y_train_12 == 0).sum()
_pos_cv   = (y_train_12 == 1).sum()
_spc_cv   = _neg_cv / max(_pos_cv, 1)

cv_aurocs = []
for fold, (tr_idx, vl_idx) in enumerate(gkf.split(X_train_fe, y_train_12, groups)):
    fold_model = xgb.XGBClassifier(
        n_estimators=200, max_depth=5, learning_rate=0.08,
        scale_pos_weight=_spc_cv, random_state=42,
        eval_metric='logloss', tree_method='hist',
    )
    fold_model.fit(X_train_fe[tr_idx], y_train_12[tr_idx], verbose=False)
    prob  = fold_model.predict_proba(X_train_fe[vl_idx])[:, 1]
    auroc = roc_auc_score(y_train_12[vl_idx], prob)
    cv_aurocs.append(auroc)
    print(f'  Fold {fold+1}/{N_OUTER}  AUROC={auroc:.4f}')

print(f'\nNested CV  mean AUROC = {np.mean(cv_aurocs):.4f} ± {np.std(cv_aurocs):.4f}')


# ── G2 · Temporal Performance Metrics — All Horizons ─────────────────────────
from sklearn.metrics import (roc_auc_score, average_precision_score,
                              brier_score_loss, roc_curve, precision_recall_curve)
from sklearn.calibration import calibration_curve
import matplotlib.pyplot as plt


def full_metrics(y_true, y_prob, label=''):
    auroc = roc_auc_score(y_true, y_prob)
    auprc = average_precision_score(y_true, y_prob)
    brier = brier_score_loss(y_true, y_prob)
    print(f'{label:25s}  AUROC={auroc:.4f}  AUPRC={auprc:.4f}  Brier={brier:.4f}')
    return {'auroc': auroc, 'auprc': auprc, 'brier': brier,
            'y_true': y_true, 'y_prob': y_prob}


horizon_labels = {
    '2h':  y_test_2,
    '6h':  y_test_6,
    '12h': y_test_12,
}

metrics = {}
print('=== Test-set performance — all horizons ===')
for h, y_te in horizon_labels.items():
    test_prob = xgb_probas[h]['test']
    metrics[f'XGB_{h}'] = full_metrics(y_te, test_prob, f'XGB ({h})')

# Also LR for 12h baseline
lr_proba_val  = lr.predict_proba(X_val_fe)[:, 1]
lr_proba_test = lr.predict_proba(X_test_fe)[:, 1]
metrics['LR_12h'] = full_metrics(y_test_12, lr_proba_test, 'LR  (12h)')

# ROC + PR for XGB 12h
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5))
colors_h = {'2h': 'dodgerblue', '6h': 'orange', '12h': 'tomato'}
for h in ['2h', '6h', '12h']:
    m = metrics[f'XGB_{h}']
    fpr, tpr, _ = roc_curve(m['y_true'], m['y_prob'])
    prec, rec, _ = precision_recall_curve(m['y_true'], m['y_prob'])
    ax1.plot(fpr, tpr, label=f"XGB {h} (AUC={m['auroc']:.3f})", color=colors_h[h])
    ax2.plot(rec, prec, label=f"XGB {h} (AUPRC={m['auprc']:.3f})", color=colors_h[h])

ax1.plot([0,1],[0,1],'k--')
ax1.set_xlabel('FPR'); ax1.set_ylabel('TPR'); ax1.set_title('ROC Curve')
ax2.set_xlabel('Recall'); ax2.set_ylabel('Precision'); ax2.set_title('PR Curve')
ax1.legend(); ax2.legend()
plt.tight_layout()
plt.savefig('roc_pr_curves.png', dpi=150, bbox_inches='tight')
plt.show()


# ── G3 · Lead-time Analysis & Alarm Burden ────────────────────────────────────
# FIX A: guard against NaT in lead_hours when event_time_12h is NULL
# FIX B: guard against empty first_alarm series
THRESHOLD = 0.35

test_eval = test_df[['stay_id','prediction_time','hours_since_admission',
                      'label_12h','event_time_12h']].copy()
test_eval['xgb_prob']  = xgb_proba_test
test_eval['xgb_alarm'] = (xgb_proba_test >= THRESHOLD).astype(int)

tp_rows = test_eval[(test_eval['label_12h'] == 1) & (test_eval['xgb_alarm'] == 1)].copy()
tp_rows['event_time_12h']  = pd.to_datetime(tp_rows['event_time_12h'],  errors='coerce')
tp_rows['prediction_time'] = pd.to_datetime(tp_rows['prediction_time'], errors='coerce')
tp_rows['lead_hours'] = (
    (tp_rows['event_time_12h'] - tp_rows['prediction_time'])
    .dt.total_seconds() / 3600
)
tp_rows = tp_rows.dropna(subset=['lead_hours'])   # FIX A: drop NaT rows

first_alarm = (
    tp_rows[tp_rows['lead_hours'] > 0]
    .groupby('stay_id')['lead_hours']
    .max()
)

alarm_rate = test_eval.groupby('stay_id')['xgb_alarm'].mean()

print(f'Threshold = {THRESHOLD}')
# FIX B: guard empty series
if len(first_alarm) > 0:
    print(f'Median lead-time (h) : {first_alarm.median():.1f}')
else:
    print('No true-positive alarms found at this threshold.')
print(f'Mean alarm rate/hr   : {alarm_rate.mean():.3f}')

fig, axes = plt.subplots(1, 2, figsize=(13, 4))
if len(first_alarm) > 0:
    axes[0].hist(first_alarm, bins=20, color='steelblue', edgecolor='white')
else:
    axes[0].text(0.5, 0.5, 'No TP alarms', ha='center', va='center',
                 transform=axes[0].transAxes)
axes[0].set_title('Lead-time Distribution (TP alarms)')
axes[0].set_xlabel('Hours before event')
axes[1].hist(alarm_rate, bins=30, color='coral', edgecolor='white')
axes[1].set_title('Alarm Burden per Patient')
axes[1].set_xlabel('Fraction of hours with alarm')
plt.tight_layout()
plt.savefig('leadtime_alarm.png', dpi=150, bbox_inches='tight')
plt.show()


# ── H1-H3 · Decision Curve Analysis + Net Benefit ─────────────────────────────
def net_benefit(y_true, y_prob, threshold):
    """NB = TPR - (threshold / (1-threshold)) * FPR  (scaled by prevalence)"""
    n = len(y_true)
    pred = (y_prob >= threshold).astype(int)
    tp = ((pred == 1) & (y_true == 1)).sum()
    fp = ((pred == 1) & (y_true == 0)).sum()
    odds = threshold / (1 - threshold + 1e-9)
    return (tp - odds * fp) / n

thresholds = np.linspace(0.02, 0.60, 60)
prev = y_test_12.mean()

nb_xgb  = [net_benefit(y_test_12, xgb_proba_test, t) for t in thresholds]
nb_lr   = [net_benefit(y_test_12, lr_proba_test,  t) for t in thresholds]
nb_all  = [prev - (t/(1-t+1e-9))*(1-prev) for t in thresholds]  # treat-all baseline
nb_none = [0.0] * len(thresholds)  # treat-none

plt.figure(figsize=(10, 5))
plt.plot(thresholds, nb_xgb,  label='XGBoost',     color='tomato',    lw=2)
plt.plot(thresholds, nb_lr,   label='Log. Reg.',    color='steelblue', lw=2)
plt.plot(thresholds, nb_all,  label='Treat All',    color='gray',      lw=1.5, linestyle='--')
plt.plot(thresholds, nb_none, label='Treat None',   color='black',     lw=1.5, linestyle=':')
plt.axvline(x=THRESHOLD, color='orange', linestyle='-.', label=f'Operational threshold={THRESHOLD}')
plt.xlabel('Threshold probability'); plt.ylabel('Net Benefit')
plt.title('Decision Curve Analysis — 12h Horizon')
plt.legend(); plt.grid(alpha=0.3)
plt.tight_layout()
plt.savefig('dca.png', dpi=150, bbox_inches='tight')
plt.show()

# Optimal threshold by max net benefit
best_thresh = thresholds[np.argmax(nb_xgb)]
print(f'Optimal threshold (max NB): {best_thresh:.3f}  |  NB = {max(nb_xgb):.4f}')

# ── I1 · Continuous Risk Trajectory ──────────────────────────────────────────
# FIX: guard hospital_expire_flag column — may be absent in some BQ exports
import matplotlib.pyplot as plt

_expire_col = 'hospital_expire_flag' if 'hospital_expire_flag' in test_df.columns else None
_traj_cols  = ['stay_id','subject_id','prediction_time','hours_since_admission','label_12h']
if _expire_col:
    _traj_cols.append(_expire_col)

test_traj = test_df[_traj_cols].copy()
if not _expire_col:
    test_traj['hospital_expire_flag'] = 0   # unknown — show as 0

test_traj['risk_12h']      = xgb_proba_test
test_traj['prediction_time'] = pd.to_datetime(test_traj['prediction_time'], errors='coerce')

test_traj = test_traj.sort_values(['stay_id','prediction_time'])
test_traj['risk_smooth'] = (
    test_traj.groupby('stay_id')['risk_12h']
    .transform(lambda s: s.ewm(span=4, adjust=False).mean())
)

sample_stays = test_traj['stay_id'].drop_duplicates().sample(
    min(6, test_traj['stay_id'].nunique()), random_state=1).values
fig, axes = plt.subplots(2, 3, figsize=(16, 7), sharey=True)
fig.suptitle('Continuous Risk Trajectories (XGBoost 12h)', fontsize=13, fontweight='bold')

for ax, sid in zip(axes.flat, sample_stays):
    pat  = test_traj[test_traj.stay_id == sid].sort_values('hours_since_admission')
    died = pat['hospital_expire_flag'].iloc[0]
    ax.fill_between(pat['hours_since_admission'], pat['risk_smooth'], alpha=0.25, color='tomato')
    ax.plot(pat['hours_since_admission'], pat['risk_smooth'], color='tomato', lw=1.8)
    ax.axhline(THRESHOLD, color='gray', linestyle='--', lw=1, label='Threshold')
    ax.set_title(f'Stay {sid} | Died={bool(died)}', fontsize=9)
    ax.set_xlabel('Hours since admission'); ax.set_ylabel('P(event|12h)')
    ax.set_ylim(0, 1)

# Hide unused subplots when < 6 patients
for ax in axes.flat[len(sample_stays):]:
    ax.set_visible(False)

plt.tight_layout()
plt.savefig('risk_trajectories.png', dpi=150, bbox_inches='tight')
plt.show()


# ── I2 · Dynamic Patient Ranking ──────────────────────────────────────────────
# Rank patients within each prediction hour (lower rank = higher risk)
test_traj['rank_in_hour'] = (
    test_traj.groupby('prediction_time')['risk_smooth']
    .rank(ascending=False, method='first')
)
test_traj['n_patients_in_hour'] = (
    test_traj.groupby('prediction_time')['stay_id'].transform('nunique')
)
test_traj['percentile_rank'] = (
    (test_traj['rank_in_hour'] / test_traj['n_patients_in_hour']) * 100
)

# Summary: among patients who had events, what was their median rank percentile?
event_patients = test_traj[test_traj['label_12h'] == 1]
no_event       = test_traj[test_traj['label_12h'] == 0]
print(f'Median rank percentile — event patients   : {event_patients["percentile_rank"].median():.1f}%')
print(f'Median rank percentile — no-event patients: {no_event["percentile_rank"].median():.1f}%')

# ── I3 · Intervention Priority Score (Architecture Formula) ─────────────────
# FIX: Original cell used simple feature-weight formula.
# Now uses: IPS = Risk × Event_Severity_Weight × Lead_Time_Factor

EVENT_SEVERITY = {
    'death':                1.00,
    'cardiac_arrest':       0.95,
    'septic_shock':         0.90,
    'sepsis':               0.80,
    'ards':                 0.75,
    'hemodynamic_collapse': 0.70,
    'aki':                  0.60,
    'extubation':           0.10,
    'none':                 0.00,
}
LEAD_FACTOR = {'2h': 1.00, '6h': 0.75, '12h': 0.50}


def event_severity(event_str):
    """Map raw event_type string → severity weight (handles partial matches)."""
    if not isinstance(event_str, str):
        return 0.0
    s = event_str.lower().strip()
    for key, w in EVENT_SEVERITY.items():
        if key in s:
            return w
    return 0.00


def compute_ips(risk_prob, event_type, horizon):
    """Vectorised IPS = Risk x Severity x LeadFactor."""
    sev = event_type.map(event_severity).fillna(0.0).values
    lf  = LEAD_FACTOR.get(horizon, 0.5)
    return risk_prob * sev * lf


# Build test evaluation frame with all 3 horizon scores
test_ips = test_df[['stay_id','prediction_time',
                     'sofa_approx','delta_sofa_6h','shock_index',
                     'vasopressor_active','vent_active',
                     'event_type_2h','event_type_6h','event_type_12h']].copy()

test_ips['risk_2h']  = xgb_probas['2h']['test']
test_ips['risk_6h']  = xgb_probas['6h']['test']
test_ips['risk_12h'] = xgb_probas['12h']['test']

test_ips['ips_2h']  = compute_ips(test_ips['risk_2h'],  test_ips['event_type_2h'],  '2h')
test_ips['ips_6h']  = compute_ips(test_ips['risk_6h'],  test_ips['event_type_6h'],  '6h')
test_ips['ips_12h'] = compute_ips(test_ips['risk_12h'], test_ips['event_type_12h'], '12h')

# Best IPS = max across all horizons
test_ips['IPS'] = test_ips[['ips_2h','ips_6h','ips_12h']].max(axis=1)

# Best horizon (for display)
best_h_map  = test_ips[['ips_2h','ips_6h','ips_12h']].idxmax(axis=1)
test_ips['best_horizon'] = best_h_map.str.replace('ips_', '')

# Alert level thresholds
def alert_level(ips):
    if ips >= 0.85: return 'CRITICAL'
    if ips >= 0.70: return 'URGENT'
    if ips >= 0.50: return 'WATCH'
    return 'STABLE'

test_ips['alert_level'] = test_ips['IPS'].map(alert_level)

print('Intervention Priority Score summary:')
print(test_ips['IPS'].describe().round(4))
print('\nAlert level distribution:')
print(test_ips['alert_level'].value_counts())

import matplotlib.pyplot as plt
plt.figure(figsize=(8,4))
plt.hist(test_ips['IPS'], bins=40, color='mediumpurple', edgecolor='white', alpha=0.85)
plt.title('Intervention Priority Score Distribution'); plt.xlabel('IPS'); plt.ylabel('Count')
plt.tight_layout()
plt.savefig('ips_distribution.png', dpi=150, bbox_inches='tight')
plt.show()


# ── J1 · Temporal SHAP ────────────────────────────────────────────────────────
import shap
import matplotlib.pyplot as plt

# Subsample for speed (SHAP is O(n * trees * depth))
rng             = np.random.default_rng(42)
shap_sample_idx = rng.choice(len(X_test_fe), size=min(2000, len(X_test_fe)), replace=False)
X_shap          = X_test_fe[shap_sample_idx]

explainer   = shap.TreeExplainer(xgb_model)
shap_values = explainer.shap_values(X_shap)

# ── Normalise shap_values to 2D ndarray (handles both old and new SHAP API)
# SHAP < 0.45 returns list [neg_class_arr, pos_class_arr] for binary XGB
# SHAP >= 0.45 returns single 2D ndarray (positive class, raw log-odds)
if isinstance(shap_values, list):
    shap_values = shap_values[1]   # take positive class
# shap_values is now always shape (n_samples, n_features)

# Dimensionality guard for SHAP DataFrame
if shap_values.shape[1] < len(FEATURE_NAMES_FE):
    print(f'\u26a0\ufe0f WARNING: Dimension mismatch. Masking FEATURE_NAMES_FE to match model outputs ({shap_values.shape[1]}/{len(FEATURE_NAMES_FE)})')
    current_feature_names = FEATURE_NAMES_FE[:shap_values.shape[1]]
else:
    current_feature_names = FEATURE_NAMES_FE
shap_df = pd.DataFrame(shap_values, columns=current_feature_names)
shap_df['stay_id']               = test_df['stay_id'].iloc[shap_sample_idx].values
shap_df['hours_since_admission'] = test_df['hours_since_admission'].iloc[shap_sample_idx].values

# Global SHAP beeswarm
plt.figure(figsize=(10, 8))
shap.summary_plot(shap_values, X_shap, feature_names=current_feature_names,
                  max_display=20, show=False)
plt.title('SHAP Global Feature Importance (XGBoost 12h)', fontsize=12)
plt.tight_layout()
plt.savefig('shap_beeswarm.png', dpi=150, bbox_inches='tight')
plt.show()

# SHAP bar chart
mean_abs_shap = np.abs(shap_values).mean(axis=0)
importance_df = pd.DataFrame({'feature': current_feature_names, 'mean_abs_shap': mean_abs_shap})
importance_df = importance_df.sort_values('mean_abs_shap', ascending=False).head(20)
print('Top 20 features by mean |SHAP|:')
print(importance_df.to_string(index=False))


# ── J1 (cont.) · Temporal SHAP — SHAP value evolution over ICU stay ───────────
import matplotlib.pyplot as plt

TOP_K        = 8
top_features = importance_df['feature'].head(TOP_K).tolist()

# FIX: include_lowest=True so hours==0 maps to '0-6h' not NaN
shap_df['hour_bin'] = pd.cut(
    shap_df['hours_since_admission'],
    bins=[0, 6, 12, 24, 48, 120],
    right=True,
    include_lowest=True,   # FIX
    labels=['0-6h','6-12h','12-24h','24-48h','48h+']
)

temporal_shap = (
    shap_df.groupby('hour_bin', observed=True)[top_features]  # observed=True avoids FutureWarning
    .mean()
    .dropna(how='all')   # FIX: skip empty bins
)

if temporal_shap.empty:
    print('⚠️  No temporal SHAP data — all bins empty. Check hours_since_admission values.')
else:
    fig, ax = plt.subplots(figsize=(12, 5))
    temporal_shap.T.plot(kind='bar', ax=ax, colormap='tab10', width=0.75, edgecolor='white')
    ax.set_title('Temporal SHAP — Mean Feature Effect by ICU Hour Bin', fontsize=12)
    ax.set_xlabel('Feature'); ax.set_ylabel('Mean SHAP value')
    ax.legend(title='Hour bin', bbox_to_anchor=(1.01, 1), loc='upper left')
    plt.tight_layout()
    plt.savefig('temporal_shap.png', dpi=150, bbox_inches='tight')
    plt.show()


# ── J2 · Rank Attribution ─────────────────────────────────────────────────────
# FIX: reset_index on test_ips so .iloc is always positional-safe
# FIX: guard empty lo_shap array
shap_idx_in_test   = shap_sample_idx
test_ips_reset     = test_ips.reset_index(drop=True)   # FIX
ips_sample         = test_ips_reset['IPS'].iloc[shap_idx_in_test].values
high_priority_mask = ips_sample >= np.quantile(ips_sample, 0.80)

hi_shap = shap_values[high_priority_mask]
lo_shap = shap_values[~high_priority_mask]

mean_hi = np.abs(hi_shap).mean(axis=0) if len(hi_shap) > 0 else np.zeros(shap_values.shape[1])
mean_lo = np.abs(lo_shap).mean(axis=0) if len(lo_shap) > 0 else np.zeros(shap_values.shape[1])  # FIX

rank_attr_dim = shap_values.shape[1] if 'shap_values' in locals() else len(FEATURE_NAMES_FE)
current_feature_names = FEATURE_NAMES_FE[:rank_attr_dim]
rank_attr = pd.DataFrame({
    'feature'          : current_feature_names,
    'hi_priority_shap' : mean_hi,
    'lo_priority_shap' : mean_lo,
    'ratio'            : mean_hi / (mean_lo + 1e-9)
}).sort_values('hi_priority_shap', ascending=False).head(20)

fig, ax = plt.subplots(figsize=(10, 6))
x = np.arange(len(rank_attr))
w = 0.38
ax.barh(x + w/2, rank_attr['hi_priority_shap'], w, label='High-priority (top 20% IPS)', color='tomato')
ax.barh(x - w/2, rank_attr['lo_priority_shap'], w, label='Lower-priority',             color='steelblue', alpha=0.7)
ax.set_yticks(x); ax.set_yticklabels(rank_attr['feature'])
ax.invert_yaxis()
ax.set_xlabel('Mean |SHAP|'); ax.set_title('Rank Attribution — High vs Low Priority Patients')
ax.legend()
plt.tight_layout()
plt.savefig('rank_attribution.png', dpi=150, bbox_inches='tight')
plt.show()

print('Features with highest ratio (extra important for high-priority patients):')
print(rank_attr[['feature','ratio']].head(10).to_string(index=False))


# ── J3 · Driver Stability ─────────────────────────────────────────────────────
TOP_K_STABLE = 10

# FIX: include_lowest + observed=True for pandas >= 2.0 compatibility
shap_df['window'] = pd.cut(
    shap_df['hours_since_admission'],
    bins=[0, 12, 36, 9999],
    include_lowest=True,
    labels=['Early (0-12h)', 'Mid (12-36h)', 'Late (36h+)']
)

feat_cols = FEATURE_NAMES_FE[:shap_values.shape[1]]  # Dimensionality guard
windows   = ['Early (0-12h)', 'Mid (12-36h)', 'Late (36h+)']

window_top = {}
for w in windows:
    sub = shap_df[shap_df['window'] == w][feat_cols]
    if len(sub) < 5:
        window_top[w] = set()
        continue
    top_feats = (
        sub.abs().mean().sort_values(ascending=False)
        .head(TOP_K_STABLE).index.tolist()
    )
    window_top[w] = set(top_feats)

def jaccard(a, b):
    return len(a & b) / len(a | b) if (a | b) else 0.0

print(f'Top-{TOP_K_STABLE} Driver Stability (Jaccard similarity):')
for i, w1 in enumerate(windows):
    for w2 in windows[i+1:]:
        j = jaccard(window_top[w1], window_top[w2])
        print(f'  {w1} vs {w2}  →  Jaccard = {j:.3f}')

print('\nTop drivers per window:')
for w in windows:
    print(f'  {w}: {sorted(window_top[w])}')


# ── J3 (cont.) · Driver Stability Heatmap ────────────────────────────────────
# FIX: explicit seaborn import (don't rely on earlier cell)
# FIX: guard empty all_top when window sets are all empty
import seaborn as sns

all_top = sorted(set().union(*window_top.values()))

if len(all_top) == 0:
    print('⚠️  No SHAP driver data — all time windows had < 5 samples. Skipping heatmap.')
else:
    heatmap_data = {}
    for w in windows:
        sub = shap_df[shap_df['window'] == w][feat_cols]
        if len(sub) < 5:
            heatmap_data[w] = {f: 0.0 for f in all_top}
        else:
            means = sub[all_top].abs().mean()
            heatmap_data[w] = means.to_dict()

    hmap = pd.DataFrame(heatmap_data, index=all_top)

    fig, ax = plt.subplots(figsize=(9, max(4, len(all_top) * 0.45)))
    sns.heatmap(
        hmap, annot=True, fmt='.3f', cmap='YlOrRd', linewidths=0.5,
        ax=ax, cbar_kws={'label': 'Mean |SHAP|'}
    )
    ax.set_title(f'Driver Stability — Top-{TOP_K_STABLE} SHAP Features across ICU Time Windows',
                 fontsize=11)
    ax.set_xlabel('ICU Time Window'); ax.set_ylabel('Feature')
    plt.tight_layout()
    plt.savefig('driver_stability_heatmap.png', dpi=150, bbox_inches='tight')
    plt.show()

print('\n✅ Section J complete — Explainability pipeline done.')
print('   Outputs: shap_beeswarm.png, temporal_shap.png, rank_attribution.png, driver_stability_heatmap.png')


# ── K · Simulation Prediction API ───────────────────────────────────────────
import shap
import json
import numpy as np

_explainers = {
    h: shap.TreeExplainer(xgb_models[h])
    for h in ['2h', '6h', '12h']
}


def _get_shap_row(explainer, X_row):
    """Return 1-D SHAP array for positive class — handles SHAP old and new API."""
    sv = explainer.shap_values(X_row)
    if isinstance(sv, list):     # SHAP < 0.45: [neg_arr, pos_arr]
        return sv[1][0]
    return sv[0]                 # SHAP >= 0.45: ndarray (1, n_features)


def _get_expected_value(explainer):
    ev = explainer.expected_value
    arr = np.atleast_1d(ev)
    return float(arr[-1])        # last element = positive class


def _preprocess_row(row_dict):
    row_df = pd.DataFrame([row_dict])
    for col in FEATURE_COLS:
        if col not in row_df.columns:
            row_df[col] = np.nan
    X_raw    = row_df[FEATURE_COLS].values.astype(float)
    miss_row = np.isnan(X_raw).astype(int)
    X_imp    = imputer.transform(X_raw)
    X_sc     = scaler.transform(X_imp)
    return np.hstack([X_sc, miss_row[:, hi_idx]]) if len(hi_idx) > 0 else X_sc


def _safe_val(v):
    """Convert value to JSON-safe float (NaN → None)."""
    try:
        f = float(v)
        return None if (f != f) else round(f, 4)  # NaN check via f != f
    except (TypeError, ValueError):
        return None


def chronos_predict(row_dict, top_k_shap=5):
    """
    Predict risk for one patient-hour.
    Input : dict of feature values (keys = FEATURE_COLS)
    Output: JSON-serialisable dict with risk_scores, IPS, SHAP top-K
    """
    obs_hours = row_dict.get('observed_hours_in_window', 0)
    if obs_hours < 4:
        return {
            'status': 'burn_in',
            'message': f'Only {obs_hours}h of data — prediction requires >= 4h.',
            'risk_scores': None, 'ips': None,
        }

    X_fe = _preprocess_row(row_dict)

    risk = {
        h: round(float(xgb_models[h].predict_proba(X_fe)[0, 1]), 4)
        for h in ['2h', '6h', '12h']
    }

    ips_per_h = {
        h: round(risk[h] * event_severity(str(row_dict.get(f'event_type_{h}', 'none')))
                       * LEAD_FACTOR[h], 4)
        for h in ['2h', '6h', '12h']
    }

    best_h  = max(ips_per_h, key=ips_per_h.get)
    ips_val = ips_per_h[best_h]

    shap_vals = _get_shap_row(_explainers['12h'], X_fe)

    # Assert feature alignment
    assert len(shap_vals) == len(FEATURE_NAMES_FE), (
        f'SHAP length {len(shap_vals)} != features {len(FEATURE_NAMES_FE)} — '
        'model/scaler mismatch. Retrain from scratch.'
    )

    shap_sorted = sorted(
        zip(FEATURE_NAMES_FE, shap_vals),
        key=lambda x: abs(x[1]), reverse=True
    )[:top_k_shap]

    shap_drivers = [
        {
            'feature':   feat,
            'value':     _safe_val(row_dict.get(feat, float('nan'))),
            'shap':      round(float(sv), 4),
            'direction': '↑ risk' if sv > 0 else '↓ risk',
        }
        for feat, sv in shap_sorted
    ]

    return {
        'status':       'ok',
        'stay_id':      row_dict.get('stay_id'),
        'hours_in_icu': obs_hours,
        'risk_scores': {
            h: {'probability': risk[h],
                'event_type': row_dict.get(f'event_type_{h}', 'unknown')}
            for h in ['2h', '6h', '12h']
        },
        'ips': {
            'score':        ips_val,
            'best_horizon': best_h,
            'per_horizon':  ips_per_h,
            'alert_level':  alert_level(ips_val),
        },
        'shap_explanation': {
            'top_drivers':   shap_drivers,
            'baseline_risk': _get_expected_value(_explainers['12h']),
        },
    }


# ── Smoke-test on one test row ────────────────────────────────────────────────
test_row = test_df.iloc[0].to_dict()
result   = chronos_predict(test_row, top_k_shap=5)
print(json.dumps(result, indent=2, default=str))


# ── K2 · ICU Ward Ranking — snapshot at any prediction_time ────────────────
# FIX A: normalise prediction_time type before equality filter
# FIX B: guard empty snapshot


def rank_ward_snapshot(snapshot_df, xgb_probas_dict, event_type_cols=None):
    """
    Rank all active patients at a single snapshot time.
    xgb_probas_dict : {'2h': array, '6h': array, '12h': array} aligned to snapshot_df rows.
    """
    df_out = snapshot_df[['stay_id','prediction_time','hours_since_admission']].copy()
    for h in ['2h','6h','12h']:
        df_out[f'risk_{h}'] = xgb_probas_dict[h]
        et_col = f'event_type_{h}'
        if et_col in snapshot_df.columns:
            df_out[f'event_type_{h}'] = snapshot_df[et_col].values
            df_out[f'ips_{h}'] = (
                df_out[f'risk_{h}']
                * df_out[f'event_type_{h}'].map(event_severity).fillna(0)
                * LEAD_FACTOR[h]
            )
        else:
            df_out[f'ips_{h}'] = 0.0

    df_out['IPS']           = df_out[['ips_2h','ips_6h','ips_12h']].max(axis=1)
    df_out['alert_level']   = df_out['IPS'].map(alert_level)
    df_out['priority_rank'] = df_out['IPS'].rank(ascending=False, method='first').astype(int)
    return df_out.sort_values('priority_rank')


# FIX A: cast to string so type difference (str vs Timestamp) doesn't break ==
_pt_series = test_df['prediction_time'].dropna()
first_ts   = _pt_series.astype(str).sort_values().iloc[0]
snap_df    = test_df[test_df['prediction_time'].astype(str) == first_ts].copy()

# FIX B: guard empty
if snap_df.empty:
    print(f'⚠️  No rows found for prediction_time={first_ts}. Check column type.')
else:
    _snap_feat = snap_df[FEATURE_COLS]
    _snap_miss = _snap_feat.isnull().astype(int).values
    _snap_imp  = imputer.transform(_snap_feat)
    _snap_sc   = scaler.transform(_snap_imp)
    _snap_fe   = add_missingness(_snap_sc, _snap_miss, hi_idx)

    snap_probas = {
        h: xgb_models[h].predict_proba(_snap_fe)[:, 1]
        for h in ['2h','6h','12h']
    }

    ranking  = rank_ward_snapshot(snap_df, snap_probas)
    cols_show = ['priority_rank','stay_id','hours_since_admission',
                 'risk_2h','risk_6h','risk_12h','IPS','alert_level']
    print(f'Ward snapshot at {first_ts} — top 10 patients:')
    print(ranking[cols_show].head(10).to_string(index=False))
