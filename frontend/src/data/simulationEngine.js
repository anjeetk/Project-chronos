/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  CHRONOS SIMULATION ENGINE
 *  Mirrors the BigQuery pipeline: 04_end_to_end_icu_event_temporal_pipeline.sql
 *  
 *  - 11 static features (hardcoded per patient)
 *  - 46 dynamic features (simulated hourly, shown every 1 min for demo)
 *  - 20 rolling 12h window features (derived from dynamic features)
 *  - Total: 77 feature columns used by the XGBoost model
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── STATIC FEATURES (11 per patient, hardcoded) ────────────────────────────
// These remain constant throughout the ICU stay
export const STATIC_FEATURES = {
  'P-1042': {
    race: 'ASIAN', gender: 'M', anchor_age: 67,
    first_careunit: 'Coronary Care Unit (CCU)',
    admission_type: 'URGENT',
    charlson_comorbidity_index: 5, oasis: 38, oasis_prob: 0.21,
    sapsii: 42, sapsii_prob: 0.28,
    hospital_expire_flag: 0, body_weight_kg: 72.5,
  },
  'P-2718': {
    race: 'WHITE', gender: 'M', anchor_age: 54,
    first_careunit: 'Medical Intensive Care Unit (MICU)',
    admission_type: 'EW EMER.',
    charlson_comorbidity_index: 3, oasis: 34, oasis_prob: 0.14,
    sapsii: 36, sapsii_prob: 0.18,
    hospital_expire_flag: 0, body_weight_kg: 84.0,
  },
  'P-3141': {
    race: 'BLACK/AFRICAN AMERICAN', gender: 'M', anchor_age: 73,
    first_careunit: 'Medical Intensive Care Unit (MICU)',
    admission_type: 'EW EMER.',
    charlson_comorbidity_index: 6, oasis: 41, oasis_prob: 0.26,
    sapsii: 48, sapsii_prob: 0.35,
    hospital_expire_flag: 0, body_weight_kg: 89.2,
  },
  'P-1618': {
    race: 'WHITE', gender: 'M', anchor_age: 45,
    first_careunit: 'Medical Intensive Care Unit (MICU)',
    admission_type: 'EW EMER.',
    charlson_comorbidity_index: 2, oasis: 44, oasis_prob: 0.32,
    sapsii: 52, sapsii_prob: 0.42,
    hospital_expire_flag: 0, body_weight_kg: 78.3,
  },
  'P-2236': {
    race: 'HISPANIC/LATINO', gender: 'M', anchor_age: 61,
    first_careunit: 'Cardiac Vascular Intensive Care Unit (CVICU)',
    admission_type: 'SURGICAL SAME DAY ADMISSION',
    charlson_comorbidity_index: 4, oasis: 29, oasis_prob: 0.08,
    sapsii: 28, sapsii_prob: 0.09,
    hospital_expire_flag: 0, body_weight_kg: 76.0,
  },
  'P-5050': {
    race: 'WHITE', gender: 'F', anchor_age: 58,
    first_careunit: 'Medical Intensive Care Unit (MICU)',
    admission_type: 'EW EMER.',
    charlson_comorbidity_index: 3, oasis: 31, oasis_prob: 0.10,
    sapsii: 30, sapsii_prob: 0.11,
    hospital_expire_flag: 0, body_weight_kg: 65.8,
  },
  'P-7777': {
    race: 'WHITE', gender: 'M', anchor_age: 82,
    first_careunit: 'Coronary Care Unit (CCU)',
    admission_type: 'EW EMER.',
    charlson_comorbidity_index: 7, oasis: 36, oasis_prob: 0.17,
    sapsii: 40, sapsii_prob: 0.24,
    hospital_expire_flag: 0, body_weight_kg: 70.2,
  },
  'P-4242': {
    race: 'WHITE', gender: 'M', anchor_age: 39,
    first_careunit: 'Trauma SICU (TSICU)',
    admission_type: 'EW EMER.',
    charlson_comorbidity_index: 0, oasis: 22, oasis_prob: 0.04,
    sapsii: 18, sapsii_prob: 0.03,
    hospital_expire_flag: 0, body_weight_kg: 82.5,
  },
  'P-9090': {
    race: 'ASIAN', gender: 'F', anchor_age: 71,
    first_careunit: 'Surgical Intensive Care Unit (SICU)',
    admission_type: 'SURGICAL SAME DAY ADMISSION',
    charlson_comorbidity_index: 2, oasis: 19, oasis_prob: 0.03,
    sapsii: 15, sapsii_prob: 0.02,
    hospital_expire_flag: 0, body_weight_kg: 58.0,
  },
  'P-6180': {
    race: 'BLACK/AFRICAN AMERICAN', gender: 'M', anchor_age: 50,
    first_careunit: 'Medical Intensive Care Unit (MICU)',
    admission_type: 'EW EMER.',
    charlson_comorbidity_index: 2, oasis: 25, oasis_prob: 0.06,
    sapsii: 22, sapsii_prob: 0.05,
    hospital_expire_flag: 0, body_weight_kg: 95.0,
  },
}

// ─── DYNAMIC FEATURE DEFINITIONS ────────────────────────────────────────────
// Each dynamic feature has: baseline range per acuity, physiological variance,
// min/max bounds, and clinical drift parameters
const ACUITY = { critical: 2.0, observing: 1.2, stable: 0.6 }

// Per-patient initial baselines (derived from realistic ICU ranges)
const PATIENT_BASELINES = {
  'P-1042': { // Post-CABG, critical
    hr: 95, map_mean: 62, sbp: 105, dbp: 55, rr: 22, spo2: 93.5,
    temp_c: 37.8, gcs_total: 14, fio2_frac: 0.45, pao2: 85,
    paco2_abg: 42, ph_abg: 7.34, lactate: 3.2, creatinine: 1.8,
    platelets: 145, bilirubin_total: 1.4, wbc: 14.2,
    sodium: 138, potassium: 4.2, bicarbonate: 20, hemoglobin: 9.8, glucose: 165,
    urine_ml: 35, vasopressor_active: 1, ne_equivalent_dose: 0.08,
    vent_active: 1, crrt_active: 0,
  },
  'P-2718': { // Pneumonia/ARDS, critical
    hr: 108, map_mean: 68, sbp: 118, dbp: 58, rr: 28, spo2: 91.0,
    temp_c: 38.5, gcs_total: 15, fio2_frac: 0.65, pao2: 72,
    paco2_abg: 48, ph_abg: 7.30, lactate: 4.1, creatinine: 1.2,
    platelets: 178, bilirubin_total: 0.9, wbc: 18.5,
    sodium: 140, potassium: 4.5, bicarbonate: 18, hemoglobin: 11.2, glucose: 142,
    urine_ml: 45, vasopressor_active: 0, ne_equivalent_dose: 0,
    vent_active: 1, crrt_active: 0,
  },
  'P-3141': { // AKI, critical
    hr: 88, map_mean: 58, sbp: 98, dbp: 48, rr: 20, spo2: 95.0,
    temp_c: 37.2, gcs_total: 14, fio2_frac: 0.40, pao2: 92,
    paco2_abg: 38, ph_abg: 7.28, lactate: 2.8, creatinine: 4.2,
    platelets: 120, bilirubin_total: 1.1, wbc: 12.4,
    sodium: 134, potassium: 5.8, bicarbonate: 16, hemoglobin: 8.5, glucose: 180,
    urine_ml: 15, vasopressor_active: 1, ne_equivalent_dose: 0.12,
    vent_active: 0, crrt_active: 1,
  },
  'P-1618': { // Septic shock, critical
    hr: 115, map_mean: 55, sbp: 88, dbp: 42, rr: 26, spo2: 92.0,
    temp_c: 39.1, gcs_total: 13, fio2_frac: 0.50, pao2: 78,
    paco2_abg: 35, ph_abg: 7.25, lactate: 5.8, creatinine: 2.1,
    platelets: 95, bilirubin_total: 2.4, wbc: 22.0,
    sodium: 136, potassium: 4.8, bicarbonate: 14, hemoglobin: 10.1, glucose: 195,
    urine_ml: 20, vasopressor_active: 1, ne_equivalent_dose: 0.25,
    vent_active: 1, crrt_active: 0,
  },
  'P-2236': { // Post-valve, observing
    hr: 78, map_mean: 72, sbp: 125, dbp: 60, rr: 16, spo2: 97.0,
    temp_c: 37.0, gcs_total: 15, fio2_frac: 0.30, pao2: 110,
    paco2_abg: 40, ph_abg: 7.40, lactate: 1.4, creatinine: 1.0,
    platelets: 210, bilirubin_total: 0.6, wbc: 8.2,
    sodium: 140, potassium: 4.0, bicarbonate: 24, hemoglobin: 11.5, glucose: 125,
    urine_ml: 65, vasopressor_active: 0, ne_equivalent_dose: 0,
    vent_active: 0, crrt_active: 0,
  },
  'P-5050': { // GI bleed, observing
    hr: 92, map_mean: 68, sbp: 110, dbp: 55, rr: 18, spo2: 96.5,
    temp_c: 37.1, gcs_total: 15, fio2_frac: 0.28, pao2: 105,
    paco2_abg: 38, ph_abg: 7.38, lactate: 1.8, creatinine: 0.9,
    platelets: 165, bilirubin_total: 0.8, wbc: 10.5,
    sodium: 139, potassium: 3.8, bicarbonate: 22, hemoglobin: 8.2, glucose: 115,
    urine_ml: 55, vasopressor_active: 0, ne_equivalent_dose: 0,
    vent_active: 0, crrt_active: 0,
  },
  'P-7777': { // CHF, observing
    hr: 82, map_mean: 65, sbp: 108, dbp: 52, rr: 20, spo2: 94.0,
    temp_c: 36.8, gcs_total: 15, fio2_frac: 0.35, pao2: 88,
    paco2_abg: 44, ph_abg: 7.36, lactate: 1.6, creatinine: 1.5,
    platelets: 195, bilirubin_total: 1.0, wbc: 9.0,
    sodium: 132, potassium: 4.6, bicarbonate: 20, hemoglobin: 10.5, glucose: 135,
    urine_ml: 40, vasopressor_active: 0, ne_equivalent_dose: 0,
    vent_active: 0, crrt_active: 0,
  },
  'P-4242': { // Trauma, stable
    hr: 72, map_mean: 82, sbp: 128, dbp: 68, rr: 14, spo2: 98.5,
    temp_c: 36.9, gcs_total: 15, fio2_frac: 0.21, pao2: 120,
    paco2_abg: 40, ph_abg: 7.42, lactate: 0.8, creatinine: 0.7,
    platelets: 280, bilirubin_total: 0.4, wbc: 7.5,
    sodium: 141, potassium: 4.0, bicarbonate: 25, hemoglobin: 13.2, glucose: 105,
    urine_ml: 80, vasopressor_active: 0, ne_equivalent_dose: 0,
    vent_active: 0, crrt_active: 0,
  },
  'P-9090': { // Elective hip, stable
    hr: 68, map_mean: 78, sbp: 122, dbp: 62, rr: 14, spo2: 99.0,
    temp_c: 36.7, gcs_total: 15, fio2_frac: 0.21, pao2: 130,
    paco2_abg: 38, ph_abg: 7.42, lactate: 0.6, creatinine: 0.8,
    platelets: 250, bilirubin_total: 0.3, wbc: 6.8,
    sodium: 140, potassium: 4.1, bicarbonate: 26, hemoglobin: 12.8, glucose: 98,
    urine_ml: 90, vasopressor_active: 0, ne_equivalent_dose: 0,
    vent_active: 0, crrt_active: 0,
  },
  'P-6180': { // DKA, stable
    hr: 76, map_mean: 75, sbp: 120, dbp: 60, rr: 22, spo2: 97.5,
    temp_c: 37.0, gcs_total: 15, fio2_frac: 0.21, pao2: 115,
    paco2_abg: 30, ph_abg: 7.30, lactate: 1.2, creatinine: 1.1,
    platelets: 230, bilirubin_total: 0.5, wbc: 11.0,
    sodium: 130, potassium: 5.2, bicarbonate: 12, hemoglobin: 14.0, glucose: 350,
    urine_ml: 100, vasopressor_active: 0, ne_equivalent_dose: 0,
    vent_active: 0, crrt_active: 0,
  },
}

// ─── DYNAMIC FEATURE SIMULATOR ─────────────────────────────────────────────
// Physiological bounds & variance for each dynamic feature
const DYNAMIC_FEATURE_CONFIG = {
  // Vitals (15 features)
  hr:               { min: 40, max: 200, variance: 4,    decimals: 1 },
  map_mean:         { min: 30, max: 140, variance: 3,    decimals: 1 },
  sbp:              { min: 60, max: 250, variance: 5,    decimals: 1 },
  dbp:              { min: 20, max: 150, variance: 3,    decimals: 1 },
  rr:               { min: 6,  max: 50,  variance: 2,    decimals: 0 },
  spo2:             { min: 70, max: 100, variance: 0.8,  decimals: 1 },
  temp_c:           { min: 34, max: 42,  variance: 0.15, decimals: 1 },
  gcs_total:        { min: 3,  max: 15,  variance: 0.3,  decimals: 0 },
  fio2_frac:        { min: 0.21, max: 1.0, variance: 0.02, decimals: 2 },
  pao2:             { min: 40, max: 400, variance: 5,    decimals: 1 },
  paco2_abg:        { min: 15, max: 80,  variance: 2,    decimals: 1 },
  ph_abg:           { min: 6.8, max: 7.7, variance: 0.01, decimals: 2 },
  // Labs (10 features)
  lactate:          { min: 0.3, max: 20,  variance: 0.3,  decimals: 2 },
  creatinine:       { min: 0.2, max: 15,  variance: 0.1,  decimals: 2 },
  platelets:        { min: 5,  max: 600,  variance: 8,    decimals: 0 },
  bilirubin_total:  { min: 0.1, max: 30,  variance: 0.1,  decimals: 1 },
  wbc:              { min: 0.5, max: 80,  variance: 0.5,  decimals: 1 },
  sodium:           { min: 115, max: 165, variance: 1,    decimals: 0 },
  potassium:        { min: 2.0, max: 8.0, variance: 0.15, decimals: 1 },
  bicarbonate:      { min: 5,  max: 45,  variance: 0.5,  decimals: 0 },
  hemoglobin:       { min: 4,  max: 20,  variance: 0.2,  decimals: 1 },
  glucose:          { min: 30, max: 600, variance: 8,    decimals: 0 },
  // Urine & organ support (4 features)
  urine_ml:         { min: 0,  max: 500, variance: 10,   decimals: 0 },
  vasopressor_active: { min: 0, max: 1, variance: 0, decimals: 0 },
  ne_equivalent_dose: { min: 0, max: 2, variance: 0.01, decimals: 3 },
  vent_active:      { min: 0, max: 1, variance: 0, decimals: 0 },
  crrt_active:      { min: 0, max: 1, variance: 0, decimals: 0 },
}

// Labels for all 77 features in the model (matching FEATURE_COLS from the notebook)
export const ALL_FEATURE_NAMES = [
  // Raw vitals (15)
  'hr', 'map_mean', 'sbp', 'dbp', 'rr', 'spo2', 'temp_c', 'pulse_pressure',
  'gcs_total', 'fio2_frac', 'pao2', 'paco2_abg', 'ph_abg', 'pf_ratio', 'sf_ratio',
  // Organ support (5)
  'vent_active', 'vasopressor_active', 'ne_equivalent_dose', 'crrt_active',
  // Labs (10)
  'lactate', 'creatinine', 'platelets', 'bilirubin_total', 'wbc',
  'sodium', 'potassium', 'bicarbonate', 'hemoglobin', 'glucose',
  // Urine (3)
  'urine_ml', 'urine_ml_per_kg', 'body_weight_kg',
  // SOFA (7)
  'sofa_resp', 'sofa_coag', 'sofa_liver', 'sofa_renal', 'sofa_cardio', 'sofa_cns', 'sofa_approx',
  // Derived risk signals (6)
  'shock_index', 'delta_sofa_6h', 'ards_flag', 'aki_stage', 'aki_stage_creat', 'aki_stage_uo',
  // Temporal context (2)
  'hours_since_admission', 'hours_since_infection',
  // Severity scores (5)
  'charlson_comorbidity_index', 'oasis', 'oasis_prob', 'sapsii', 'sapsii_prob',
  // 12h rolling window (20)
  'hr_mean_12h', 'hr_std_12h', 'map_min_12h', 'map_mean_12h',
  'lactate_max_12h', 'creatinine_max_12h', 'platelets_min_12h', 'bilirubin_max_12h',
  'urine_sum_12h', 'urine_per_kg_sum_12h', 'vasopressor_any_12h', 'ne_dose_mean_12h',
  'vent_any_12h', 'sofa_max_12h', 'delta_sofa_mean_12h', 'aki_stage_max_12h',
  'pf_ratio_min_12h', 'sf_ratio_min_12h', 'shock_index_max_12h', 'observed_hours_in_window',
]

// Human-readable labels for dashboard display
export const FEATURE_LABELS = {
  hr: 'Heart Rate', map_mean: 'Mean Arterial Pressure', sbp: 'Systolic BP',
  dbp: 'Diastolic BP', rr: 'Respiratory Rate', spo2: 'SpO₂',
  temp_c: 'Temperature (°C)', pulse_pressure: 'Pulse Pressure',
  gcs_total: 'Glasgow Coma Scale', fio2_frac: 'FiO₂ Fraction',
  pao2: 'PaO₂', paco2_abg: 'PaCO₂', ph_abg: 'Arterial pH',
  pf_ratio: 'P/F Ratio', sf_ratio: 'S/F Ratio',
  vent_active: 'Ventilator Active', vasopressor_active: 'Vasopressor Active',
  ne_equivalent_dose: 'NE Equiv. Dose', crrt_active: 'CRRT Active',
  lactate: 'Lactate', creatinine: 'Creatinine', platelets: 'Platelets',
  bilirubin_total: 'Bilirubin (Total)', wbc: 'White Blood Cells',
  sodium: 'Sodium', potassium: 'Potassium', bicarbonate: 'Bicarbonate',
  hemoglobin: 'Hemoglobin', glucose: 'Glucose',
  urine_ml: 'Urine Output (mL)', urine_ml_per_kg: 'Urine mL/kg',
  body_weight_kg: 'Body Weight (kg)',
  sofa_resp: 'SOFA Respiratory', sofa_coag: 'SOFA Coagulation',
  sofa_liver: 'SOFA Liver', sofa_renal: 'SOFA Renal',
  sofa_cardio: 'SOFA Cardiovascular', sofa_cns: 'SOFA CNS',
  sofa_approx: 'SOFA Total',
  shock_index: 'Shock Index', delta_sofa_6h: 'ΔSOFA (6h)',
  ards_flag: 'ARDS Flag', aki_stage: 'AKI Stage',
  aki_stage_creat: 'AKI Stage (Creat)', aki_stage_uo: 'AKI Stage (UO)',
  hours_since_admission: 'Hours Since Admission',
  hours_since_infection: 'Hours Since Infection',
  charlson_comorbidity_index: 'Charlson Index', oasis: 'OASIS Score',
  oasis_prob: 'OASIS Probability', sapsii: 'SAPS II Score',
  sapsii_prob: 'SAPS II Probability',
  hr_mean_12h: 'HR Mean (12h)', hr_std_12h: 'HR Std (12h)',
  map_min_12h: 'MAP Min (12h)', map_mean_12h: 'MAP Mean (12h)',
  lactate_max_12h: 'Lactate Max (12h)', creatinine_max_12h: 'Creatinine Max (12h)',
  platelets_min_12h: 'Platelets Min (12h)', bilirubin_max_12h: 'Bilirubin Max (12h)',
  urine_sum_12h: 'Urine Sum (12h)', urine_per_kg_sum_12h: 'Urine/kg Sum (12h)',
  vasopressor_any_12h: 'Vasopressor Any (12h)', ne_dose_mean_12h: 'NE Mean (12h)',
  vent_any_12h: 'Vent Any (12h)', sofa_max_12h: 'SOFA Max (12h)',
  delta_sofa_mean_12h: 'ΔSOFA Mean (12h)', aki_stage_max_12h: 'AKI Max (12h)',
  pf_ratio_min_12h: 'P/F Min (12h)', sf_ratio_min_12h: 'S/F Min (12h)',
  shock_index_max_12h: 'SI Max (12h)', observed_hours_in_window: 'Obs. Hours in Window',
}

// Feature categories for dashboard grouping
export const FEATURE_CATEGORIES = {
  'Vitals': ['hr', 'map_mean', 'sbp', 'dbp', 'rr', 'spo2', 'temp_c', 'pulse_pressure', 'gcs_total'],
  'Oxygenation': ['fio2_frac', 'pao2', 'paco2_abg', 'ph_abg', 'pf_ratio', 'sf_ratio'],
  'Organ Support': ['vent_active', 'vasopressor_active', 'ne_equivalent_dose', 'crrt_active'],
  'Laboratory': ['lactate', 'creatinine', 'platelets', 'bilirubin_total', 'wbc', 'sodium', 'potassium', 'bicarbonate', 'hemoglobin', 'glucose'],
  'Renal': ['urine_ml', 'urine_ml_per_kg', 'body_weight_kg'],
  'SOFA Scores': ['sofa_resp', 'sofa_coag', 'sofa_liver', 'sofa_renal', 'sofa_cardio', 'sofa_cns', 'sofa_approx'],
  'Risk Indices': ['shock_index', 'delta_sofa_6h', 'ards_flag', 'aki_stage', 'aki_stage_creat', 'aki_stage_uo'],
  'Temporal': ['hours_since_admission', 'hours_since_infection'],
  'Severity Scores': ['charlson_comorbidity_index', 'oasis', 'oasis_prob', 'sapsii', 'sapsii_prob'],
  '12h Rolling Window': [
    'hr_mean_12h', 'hr_std_12h', 'map_min_12h', 'map_mean_12h',
    'lactate_max_12h', 'creatinine_max_12h', 'platelets_min_12h', 'bilirubin_max_12h',
    'urine_sum_12h', 'urine_per_kg_sum_12h', 'vasopressor_any_12h', 'ne_dose_mean_12h',
    'vent_any_12h', 'sofa_max_12h', 'delta_sofa_mean_12h', 'aki_stage_max_12h',
    'pf_ratio_min_12h', 'sf_ratio_min_12h', 'shock_index_max_12h', 'observed_hours_in_window',
  ],
}

// Feature units for display
export const FEATURE_UNITS = {
  hr: 'bpm', map_mean: 'mmHg', sbp: 'mmHg', dbp: 'mmHg', rr: '/min',
  spo2: '%', temp_c: '°C', pulse_pressure: 'mmHg', gcs_total: '/15',
  fio2_frac: '', pao2: 'mmHg', paco2_abg: 'mmHg', ph_abg: '',
  pf_ratio: '', sf_ratio: '', vent_active: '', vasopressor_active: '',
  ne_equivalent_dose: 'mcg/kg/min', crrt_active: '', lactate: 'mmol/L',
  creatinine: 'mg/dL', platelets: '×10³/µL', bilirubin_total: 'mg/dL',
  wbc: '×10³/µL', sodium: 'mEq/L', potassium: 'mEq/L',
  bicarbonate: 'mEq/L', hemoglobin: 'g/dL', glucose: 'mg/dL',
  urine_ml: 'mL/hr', urine_ml_per_kg: 'mL/kg/hr', body_weight_kg: 'kg',
  sofa_resp: '', sofa_coag: '', sofa_liver: '', sofa_renal: '',
  sofa_cardio: '', sofa_cns: '', sofa_approx: '/24',
  shock_index: '', delta_sofa_6h: '',
  ards_flag: '', aki_stage: '/3', aki_stage_creat: '/3', aki_stage_uo: '/3',
  hours_since_admission: 'h', hours_since_infection: 'h',
  charlson_comorbidity_index: '', oasis: '', oasis_prob: '',
  sapsii: '', sapsii_prob: '',
  hr_mean_12h: 'bpm', hr_std_12h: 'bpm', map_min_12h: 'mmHg',
  map_mean_12h: 'mmHg', lactate_max_12h: 'mmol/L', creatinine_max_12h: 'mg/dL',
  platelets_min_12h: '×10³/µL', bilirubin_max_12h: 'mg/dL',
  urine_sum_12h: 'mL', urine_per_kg_sum_12h: 'mL/kg',
  vasopressor_any_12h: '', ne_dose_mean_12h: 'mcg/kg/min',
  vent_any_12h: '', sofa_max_12h: '/24', delta_sofa_mean_12h: '',
  aki_stage_max_12h: '/3', pf_ratio_min_12h: '', sf_ratio_min_12h: '',
  shock_index_max_12h: '', observed_hours_in_window: 'h',
}

// ─── SOFA SCORE CALCULATORS (mirrors SQL logic) ────────────────────────────
function calcSofaResp(pf_ratio, sf_ratio, vent_active) {
  if (pf_ratio != null) {
    if (pf_ratio < 100 && vent_active) return 4
    if (pf_ratio < 200 && vent_active) return 3
    if (pf_ratio < 300) return 2
    if (pf_ratio < 400) return 1
    return 0
  }
  if (sf_ratio != null) {
    if (sf_ratio < 150 && vent_active) return 4
    if (sf_ratio < 235 && vent_active) return 3
  }
  return 0
}

function calcSofaCoag(platelets) {
  if (platelets == null) return 0
  if (platelets < 20) return 4
  if (platelets < 50) return 3
  if (platelets < 100) return 2
  if (platelets < 150) return 1
  return 0
}

function calcSofaLiver(bilirubin) {
  if (bilirubin == null) return 0
  if (bilirubin >= 12) return 4
  if (bilirubin >= 6) return 3
  if (bilirubin >= 2) return 2
  if (bilirubin >= 1.2) return 1
  return 0
}

function calcSofaRenal(creatinine, urine_ml_per_kg, crrt_active) {
  if (crrt_active) return 4
  if (creatinine >= 5) return 4
  if (creatinine >= 3.5) return 3
  if (creatinine >= 2) return 2
  if (creatinine >= 1.2) return 1
  return 0
}

function calcSofaCardio(map_mean, vasopressor_active, ne_dose) {
  if (ne_dose > 0.1) return 4
  if (ne_dose > 0) return 3
  if (vasopressor_active) return 2
  if (map_mean < 70) return 1
  return 0
}

function calcSofaCns(gcs) {
  if (gcs == null) return 0
  if (gcs < 6) return 4
  if (gcs < 10) return 3
  if (gcs < 13) return 2
  if (gcs < 15) return 1
  return 0
}

// ─── MAIN SIMULATION CLASS ─────────────────────────────────────────────────
export class ICUSimulationEngine {
  constructor() {
    // History stores: patientId -> array of hourly snapshots
    this.history = {}
    this.currentState = {}
    this.hourCounter = {}
  }

  /**
   * Initialize simulation for a patient
   */
  initPatient(patientId, status = 'stable') {
    const baselines = PATIENT_BASELINES[patientId]
    const statics = STATIC_FEATURES[patientId]
    if (!baselines || !statics) return null

    const initial = this._computeFullSnapshot(baselines, statics, 0, [])
    this.currentState[patientId] = { ...baselines }
    this.history[patientId] = [initial]
    this.hourCounter[patientId] = 0
    return initial
  }

  /**
   * Advance simulation by 1 hour for a patient
   * Returns the new full snapshot (all 77 features)
   */
  tick(patientId, status = 'stable') {
    const baselines = PATIENT_BASELINES[patientId]
    const statics = STATIC_FEATURES[patientId]
    const currentDynamic = this.currentState[patientId]
    if (!baselines || !currentDynamic) {
      this.initPatient(patientId, status)
      return this.history[patientId]?.[0] || null
    }

    const volatility = ACUITY[status] || 1.0
    this.hourCounter[patientId] = (this.hourCounter[patientId] || 0) + 1
    const hour = this.hourCounter[patientId]

    // Simulate each dynamic variable with mean-reverting random walk
    const newDynamic = {}
    for (const [key, cfg] of Object.entries(DYNAMIC_FEATURE_CONFIG)) {
      const current = currentDynamic[key]
      const baseline = baselines[key]
      
      if (cfg.variance === 0) {
        // Binary / static-ish features: occasional toggle for critical patients
        if (key === 'vasopressor_active' || key === 'vent_active' || key === 'crrt_active') {
          newDynamic[key] = current // keep same
        } else {
          newDynamic[key] = current
        }
        continue
      }

      // Ornstein-Uhlenbeck process: mean-reverting random walk
      const theta = 0.15 // reversion speed
      const sigma = cfg.variance * volatility
      const drift = theta * (baseline - current)
      const noise = (Math.random() - 0.5) * 2 * sigma
      const raw = current + drift + noise
      const clamped = Math.max(cfg.min, Math.min(cfg.max, raw))
      newDynamic[key] = Number(clamped.toFixed(cfg.decimals))
    }

    // NE dose tracks vasopressor status
    if (newDynamic.vasopressor_active === 0) {
      newDynamic.ne_equivalent_dose = 0
    }

    this.currentState[patientId] = newDynamic

    const snapshot = this._computeFullSnapshot(newDynamic, statics, hour, this.history[patientId])
    this.history[patientId].push(snapshot)

    // Keep last 72 hours of history
    if (this.history[patientId].length > 72) {
      this.history[patientId] = this.history[patientId].slice(-72)
    }

    return snapshot
  }

  /**
   * Get the full history for a patient
   */
  getHistory(patientId) {
    return this.history[patientId] || []
  }

  /**
   * Get current snapshot for a patient
   */
  getCurrent(patientId) {
    const hist = this.history[patientId]
    return hist ? hist[hist.length - 1] : null
  }

  /**
   * Compute all 77 features from raw dynamic + static values
   */
  _computeFullSnapshot(dynamic, statics, hour, history) {
    const d = dynamic
    const s = statics

    // Derived vitals
    const pulse_pressure = (d.sbp != null && d.dbp != null) ? d.sbp - d.dbp : null
    const pf_ratio = (d.fio2_frac > 0 && d.pao2 != null) ? d.pao2 / d.fio2_frac : null
    const sf_ratio = (d.fio2_frac > 0 && d.spo2 != null) ? d.spo2 / d.fio2_frac : null
    const shock_index = (d.sbp > 0 && d.hr != null) ? d.hr / d.sbp : null

    // Urine per kg
    const urine_ml_per_kg = (s.body_weight_kg > 0 && d.urine_ml != null)
      ? Number((d.urine_ml / s.body_weight_kg).toFixed(2)) : null

    // SOFA components
    const sofa_resp = calcSofaResp(pf_ratio, sf_ratio, d.vent_active)
    const sofa_coag = calcSofaCoag(d.platelets)
    const sofa_liver = calcSofaLiver(d.bilirubin_total)
    const sofa_renal = calcSofaRenal(d.creatinine, urine_ml_per_kg, d.crrt_active)
    const sofa_cardio = calcSofaCardio(d.map_mean, d.vasopressor_active, d.ne_equivalent_dose)
    const sofa_cns = calcSofaCns(d.gcs_total)
    const sofa_approx = sofa_resp + sofa_coag + sofa_liver + sofa_renal + sofa_cardio + sofa_cns

    // AKI staging
    const aki_stage_creat = d.creatinine >= 3 ? 3 : d.creatinine >= 2 ? 2 : d.creatinine >= 1.5 ? 1 : 0
    const aki_stage_uo = (urine_ml_per_kg != null && urine_ml_per_kg < 0.3) ? 3 
      : (urine_ml_per_kg != null && urine_ml_per_kg < 0.5) ? 2 
      : (urine_ml_per_kg != null && urine_ml_per_kg < 1.0) ? 1 : 0
    const aki_stage = Math.max(aki_stage_creat, aki_stage_uo)

    // ARDS flag
    const ards_flag = ((pf_ratio != null && pf_ratio < 200) || (sf_ratio != null && sf_ratio < 235)) && d.vent_active ? 1 : 0

    // SOFA history for delta
    const sofa_6h_ago = history.length >= 6 ? (history[history.length - 6]?.sofa_approx || sofa_approx) : sofa_approx
    const delta_sofa_6h = sofa_approx - sofa_6h_ago

    // 12h rolling window features from history
    const window = history.slice(-12)
    const hrs = window.map(h => h?.hr).filter(v => v != null)
    const maps = window.map(h => h?.map_mean).filter(v => v != null)
    const lacs = window.map(h => h?.lactate).filter(v => v != null)
    const creats = window.map(h => h?.creatinine).filter(v => v != null)
    const plts = window.map(h => h?.platelets).filter(v => v != null)
    const bilis = window.map(h => h?.bilirubin_total).filter(v => v != null)
    const urines = window.map(h => h?.urine_ml).filter(v => v != null)
    const urine_kgs = window.map(h => h?.urine_ml_per_kg).filter(v => v != null)
    const ne_doses = window.map(h => h?.ne_equivalent_dose).filter(v => v != null)
    const sofas = window.map(h => h?.sofa_approx).filter(v => v != null)
    const deltas = window.map(h => h?.delta_sofa_6h).filter(v => v != null)
    const akis = window.map(h => h?.aki_stage).filter(v => v != null)
    const pfs = window.map(h => h?.pf_ratio).filter(v => v != null)
    const sfs = window.map(h => h?.sf_ratio).filter(v => v != null)
    const sis = window.map(h => h?.shock_index).filter(v => v != null)

    const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null
    const std = arr => {
      if (arr.length < 2) return 0
      const m = mean(arr)
      return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1))
    }
    const min_ = arr => arr.length ? Math.min(...arr) : null
    const max_ = arr => arr.length ? Math.max(...arr) : null
    const sum_ = arr => arr.length ? arr.reduce((a, b) => a + b, 0) : null

    return {
      // Raw vitals
      hr: d.hr, map_mean: d.map_mean, sbp: d.sbp, dbp: d.dbp,
      rr: d.rr, spo2: d.spo2, temp_c: d.temp_c, pulse_pressure,
      gcs_total: d.gcs_total, fio2_frac: d.fio2_frac,
      pao2: d.pao2, paco2_abg: d.paco2_abg, ph_abg: d.ph_abg,
      pf_ratio: pf_ratio ? Number(pf_ratio.toFixed(1)) : null,
      sf_ratio: sf_ratio ? Number(sf_ratio.toFixed(1)) : null,
      // Organ support
      vent_active: d.vent_active, vasopressor_active: d.vasopressor_active,
      ne_equivalent_dose: d.ne_equivalent_dose, crrt_active: d.crrt_active,
      // Labs
      lactate: d.lactate, creatinine: d.creatinine, platelets: d.platelets,
      bilirubin_total: d.bilirubin_total, wbc: d.wbc,
      sodium: d.sodium, potassium: d.potassium, bicarbonate: d.bicarbonate,
      hemoglobin: d.hemoglobin, glucose: d.glucose,
      // Urine
      urine_ml: d.urine_ml, urine_ml_per_kg, body_weight_kg: s.body_weight_kg,
      // SOFA
      sofa_resp, sofa_coag, sofa_liver, sofa_renal, sofa_cardio, sofa_cns, sofa_approx,
      // Derived risk
      shock_index: shock_index ? Number(shock_index.toFixed(3)) : null,
      delta_sofa_6h,
      ards_flag, aki_stage, aki_stage_creat, aki_stage_uo,
      // Temporal context
      hours_since_admission: hour,
      hours_since_infection: null, // not applicable in simulation
      // Severity scores (static)
      charlson_comorbidity_index: s.charlson_comorbidity_index,
      oasis: s.oasis, oasis_prob: s.oasis_prob,
      sapsii: s.sapsii, sapsii_prob: s.sapsii_prob,
      // 12h rolling window
      hr_mean_12h: mean(hrs) ? Number(mean(hrs).toFixed(1)) : d.hr,
      hr_std_12h: Number(std(hrs).toFixed(2)),
      map_min_12h: min_(maps) ?? d.map_mean,
      map_mean_12h: mean(maps) ? Number(mean(maps).toFixed(1)) : d.map_mean,
      lactate_max_12h: max_(lacs) ?? d.lactate,
      creatinine_max_12h: max_(creats) ?? d.creatinine,
      platelets_min_12h: min_(plts) ?? d.platelets,
      bilirubin_max_12h: max_(bilis) ?? d.bilirubin_total,
      urine_sum_12h: sum_(urines) ?? d.urine_ml,
      urine_per_kg_sum_12h: sum_(urine_kgs) ?? urine_ml_per_kg,
      vasopressor_any_12h: window.some(h => h?.vasopressor_active) ? 1 : 0,
      ne_dose_mean_12h: mean(ne_doses) ? Number(mean(ne_doses).toFixed(3)) : 0,
      vent_any_12h: window.some(h => h?.vent_active) ? 1 : 0,
      sofa_max_12h: max_(sofas) ?? sofa_approx,
      delta_sofa_mean_12h: mean(deltas) ? Number(mean(deltas).toFixed(2)) : 0,
      aki_stage_max_12h: max_(akis) ?? aki_stage,
      pf_ratio_min_12h: min_(pfs) ?? pf_ratio,
      sf_ratio_min_12h: min_(sfs) ?? sf_ratio,
      shock_index_max_12h: max_(sis) ?? shock_index,
      observed_hours_in_window: Math.min(window.length + 1, 12),
      // Metadata
      _hour: hour,
      _timestamp: new Date(Date.now() + hour * 3600000).toISOString(),
    }
  }
}

// Singleton engine instance
export const simulationEngine = new ICUSimulationEngine()
