-- BigQuery Standard SQL script
-- End-to-end ICU foundation -> clinical event modeling -> temporal dataset construction.
-- This version is split-safe for downstream patient-level train/validation/test splitting.
-- Replace the final destination tables with your own BigQuery dataset before running.
--
-- Important note:
-- This is a stronger paper-style phenotyping starter script for MIMIC-IV, but it is still
-- a reproducible approximation rather than a direct copy of any one published phenotype package.
-- The custom hemodynamic collapse ontology remains study-specific and should be justified in the paper.

DECLARE min_icu_hours INT64 DEFAULT 24;
DECLARE early_death_hours INT64 DEFAULT 24;
DECLARE hourly_resolution_hours INT64 DEFAULT 1;
DECLARE window_hours INT64 DEFAULT 12;
DECLARE exclude_elective_surgery BOOL DEFAULT TRUE;
DECLARE exclude_dnr_and_comfort BOOL DEFAULT FALSE;
DECLARE external_transfer_regex STRING DEFAULT r'ACUTE HOSPITAL|OTHER HOSPITAL';

DECLARE horizon_2h INT64 DEFAULT 2;
DECLARE horizon_6h INT64 DEFAULT 6;
DECLARE horizon_12h INT64 DEFAULT 12;

-- 1) ICU DATA FOUNDATION -----------------------------------------------------
CREATE TEMP TABLE foundation_cohort AS
WITH base AS (
  SELECT
    icu.subject_id,
    icu.hadm_id,
    icu.stay_id,
    icu.first_careunit,
    icu.last_careunit,
    icu.intime,
    icu.outtime,
    TIMESTAMP_DIFF(icu.outtime, icu.intime, HOUR) AS icu_los_hours,
    adm.admittime,
    adm.dischtime,
    adm.deathtime,
    adm.admission_type,
    adm.admission_location,
    adm.discharge_location,
    adm.hospital_expire_flag,
    pat.gender,
    pat.anchor_age,
    ROW_NUMBER() OVER (PARTITION BY icu.subject_id ORDER BY icu.intime) AS icu_seq,
    ROW_NUMBER() OVER (PARTITION BY adm.subject_id ORDER BY adm.admittime) AS hospital_adm_seq
  FROM `physionet-data.mimiciv_icu.icustays` AS icu
  INNER JOIN `physionet-data.mimiciv_hosp.admissions` AS adm
    ON icu.hadm_id = adm.hadm_id
  INNER JOIN `physionet-data.mimiciv_hosp.patients` AS pat
    ON icu.subject_id = pat.subject_id
),
vital_coverage AS (
  SELECT
    ce.stay_id,
    COUNT(DISTINCT CASE
      WHEN UPPER(di.label) = 'HEART RATE' THEN 'hr'
      WHEN UPPER(di.label) IN ('ARTERIAL BLOOD PRESSURE MEAN', 'NON INVASIVE BLOOD PRESSURE MEAN') THEN 'map'
      WHEN UPPER(di.label) IN ('ARTERIAL BLOOD PRESSURE SYSTOLIC', 'NON INVASIVE BLOOD PRESSURE SYSTOLIC') THEN 'sbp'
      WHEN UPPER(di.label) = 'RESPIRATORY RATE' THEN 'rr'
      WHEN UPPER(di.label) IN ('O2 SATURATION PULSEOXIMETRY', 'SPO2') THEN 'spo2'
      WHEN UPPER(di.label) IN ('TEMPERATURE CELSIUS', 'TEMPERATURE FAHRENHEIT') THEN 'temp'
      ELSE NULL
    END) AS vital_types_present
  FROM `physionet-data.mimiciv_icu.chartevents` AS ce
  INNER JOIN `physionet-data.mimiciv_icu.d_items` AS di
    ON ce.itemid = di.itemid
  INNER JOIN base AS b
    ON ce.stay_id = b.stay_id
  WHERE ce.charttime >= b.intime
    AND ce.charttime < TIMESTAMP_ADD(b.intime, INTERVAL 24 HOUR)
    AND ce.valuenum IS NOT NULL
  GROUP BY ce.stay_id
),
lab_coverage AS (
  SELECT
    b.stay_id,
    COUNT(DISTINCT CASE
      WHEN UPPER(dl.label) IN ('LACTATE', 'CREATININE', 'PLATELET COUNT', 'BILIRUBIN, TOTAL', 'PO2')
        THEN UPPER(dl.label)
      ELSE NULL
    END) AS lab_types_present
  FROM base AS b
  INNER JOIN `physionet-data.mimiciv_hosp.labevents` AS le
    ON b.hadm_id = le.hadm_id
  INNER JOIN `physionet-data.mimiciv_hosp.d_labitems` AS dl
    ON le.itemid = dl.itemid
  WHERE le.charttime >= b.intime
    AND le.charttime < TIMESTAMP_ADD(b.intime, INTERVAL 24 HOUR)
    AND le.valuenum IS NOT NULL
  GROUP BY b.stay_id
),
transfer_summary AS (
  SELECT
    b.stay_id,
    COUNTIF(t.careunit IS NOT NULL) AS hospital_transfer_count,
    COUNTIF(t.careunit IS NOT NULL AND t.intime > b.outtime) AS post_icu_transfer_count,
    MAX(CASE WHEN t.eventtype = 'discharge' THEN TIMESTAMP_TRUNC(t.intime, HOUR) END) AS hospital_discharge_event_time
  FROM base AS b
  LEFT JOIN `physionet-data.mimiciv_hosp.transfers` AS t
    ON b.hadm_id = t.hadm_id
  GROUP BY b.stay_id
),
code_status_flags AS (
  SELECT
    ce.stay_id,
    MIN(ce.charttime) AS first_code_status_time,
    MAX(
      IF(
        REGEXP_CONTAINS(UPPER(COALESCE(ce.value, '')), r'DNR|DO NOT RESUSCITATE|COMFORT|CMO|PALLIATIVE|HOSPICE'),
        1,
        0
      )
    ) AS dnr_or_comfort_flag
  FROM `physionet-data.mimiciv_icu.chartevents` AS ce
  INNER JOIN `physionet-data.mimiciv_icu.d_items` AS di
    ON ce.itemid = di.itemid
  INNER JOIN base AS b
    ON ce.stay_id = b.stay_id
  WHERE ce.charttime >= b.intime
    AND ce.charttime < TIMESTAMP_ADD(b.intime, INTERVAL 24 HOUR)
    AND (
      UPPER(di.label) LIKE 'CODE STATUS%'
      OR UPPER(di.label) LIKE '%PALLIATIVE%'
      OR UPPER(di.label) LIKE '%COMFORT%'
    )
  GROUP BY ce.stay_id
),
cohort_enriched AS (
  SELECT
    b.*,
    COALESCE(vc.vital_types_present, 0) AS vital_types_present,
    COALESCE(lc.lab_types_present, 0) AS lab_types_present,
    COALESCE(ts.hospital_transfer_count, 0) AS hospital_transfer_count,
    COALESCE(ts.post_icu_transfer_count, 0) AS post_icu_transfer_count,
    COALESCE(cs.dnr_or_comfort_flag, 0) AS dnr_or_comfort_flag,
    IF(
      REGEXP_CONTAINS(UPPER(COALESCE(b.discharge_location, '')), external_transfer_regex),
      1,
      0
    ) AS external_transfer_out_flag
  FROM base AS b
  LEFT JOIN vital_coverage AS vc
    ON b.stay_id = vc.stay_id
  LEFT JOIN lab_coverage AS lc
    ON b.stay_id = lc.stay_id
  LEFT JOIN transfer_summary AS ts
    ON b.stay_id = ts.stay_id
  LEFT JOIN code_status_flags AS cs
    ON b.stay_id = cs.stay_id
)
SELECT *
FROM cohort_enriched
WHERE anchor_age >= 18
  AND icu_seq = 1
  AND hospital_adm_seq = 1
  AND icu_los_hours >= min_icu_hours
  AND (deathtime IS NULL OR TIMESTAMP_DIFF(deathtime, intime, HOUR) >= early_death_hours)
  AND external_transfer_out_flag = 0
  AND vital_types_present >= 4
  AND lab_types_present >= 2
  AND (
    exclude_elective_surgery = FALSE
    OR admission_type NOT IN ('ELECTIVE', 'SURGICAL SAME DAY ADMISSION')
  )
  AND (
    exclude_dnr_and_comfort = FALSE
    OR dnr_or_comfort_flag = 0
  );

-- 2) CLINICAL EVENT MODELING -------------------------------------------------
CREATE TEMP TABLE diagnosis_context AS
SELECT
  c.hadm_id,
  MAX(IF(REGEXP_CONTAINS(UPPER(COALESCE(dd.long_title, '')), r'SEPSIS|SEPTIC SHOCK|SEPTICEMIA'), 1, 0)) AS sepsis_icd_flag,
  MAX(IF(REGEXP_CONTAINS(UPPER(COALESCE(dd.long_title, '')), r'CARDIAC ARREST|RESPIRATORY ARREST|PULMONARY ARREST|VENTRICULAR FIBRILLATION'), 1, 0)) AS arrest_icd_flag
FROM foundation_cohort AS c
LEFT JOIN `physionet-data.mimiciv_hosp.diagnoses_icd` AS dx
  ON c.hadm_id = dx.hadm_id
LEFT JOIN `physionet-data.mimiciv_hosp.d_icd_diagnoses` AS dd
  ON dx.icd_code = dd.icd_code
 AND dx.icd_version = dd.icd_version
GROUP BY c.hadm_id;

CREATE TEMP TABLE procedure_context AS
SELECT
  c.hadm_id,
  MAX(IF(REGEXP_CONTAINS(UPPER(COALESCE(dp.long_title, '')), r'CARDIOVERSION|DEFIBRILLATION|RESUSCITATION|CARDIAC MASSAGE'), 1, 0)) AS arrest_proc_icd_flag,
  MAX(IF(REGEXP_CONTAINS(UPPER(COALESCE(dp.long_title, '')), r'BYPASS|CRANIOTOMY|VALVE|THORACOTOMY|LAPAROTOMY|TRANSPLANT'), 1, 0)) AS major_surgery_proc_icd_flag
FROM foundation_cohort AS c
LEFT JOIN `physionet-data.mimiciv_hosp.procedures_icd` AS px
  ON c.hadm_id = px.hadm_id
LEFT JOIN `physionet-data.mimiciv_hosp.d_icd_procedures` AS dp
  ON px.icd_code = dp.icd_code
 AND px.icd_version = dp.icd_version
GROUP BY c.hadm_id;

CREATE TEMP TABLE hourly_grid AS
SELECT
  c.subject_id,
  c.hadm_id,
  c.stay_id,
  c.intime,
  c.outtime,
  c.deathtime,
  ts AS hour_ts
FROM foundation_cohort AS c,
UNNEST(
  GENERATE_TIMESTAMP_ARRAY(
    TIMESTAMP_TRUNC(c.intime, HOUR),
    TIMESTAMP_TRUNC(c.outtime, HOUR),
    INTERVAL hourly_resolution_hours HOUR
  )
) AS ts;

CREATE TEMP TABLE hourly_vitals AS
SELECT
  ce.stay_id,
  TIMESTAMP_TRUNC(ce.charttime, HOUR) AS hour_ts,
  AVG(CASE WHEN UPPER(di.label) = 'HEART RATE' AND ce.valuenum BETWEEN 20 AND 250 THEN ce.valuenum END) AS hr,
  AVG(CASE WHEN UPPER(di.label) IN ('ARTERIAL BLOOD PRESSURE MEAN', 'NON INVASIVE BLOOD PRESSURE MEAN') AND ce.valuenum BETWEEN 20 AND 220 THEN ce.valuenum END) AS map_mean,
  AVG(CASE WHEN UPPER(di.label) IN ('ARTERIAL BLOOD PRESSURE SYSTOLIC', 'NON INVASIVE BLOOD PRESSURE SYSTOLIC') AND ce.valuenum BETWEEN 40 AND 300 THEN ce.valuenum END) AS sbp,
  AVG(CASE WHEN UPPER(di.label) = 'RESPIRATORY RATE' AND ce.valuenum BETWEEN 4 AND 80 THEN ce.valuenum END) AS rr,
  AVG(CASE WHEN UPPER(di.label) IN ('O2 SATURATION PULSEOXIMETRY', 'SPO2') AND ce.valuenum BETWEEN 40 AND 100 THEN ce.valuenum END) AS spo2,
  AVG(CASE
    WHEN UPPER(di.label) = 'TEMPERATURE CELSIUS' AND ce.valuenum BETWEEN 30 AND 43 THEN ce.valuenum
    WHEN UPPER(di.label) = 'TEMPERATURE FAHRENHEIT' AND ce.valuenum BETWEEN 86 AND 109.4 THEN (ce.valuenum - 32) * 5 / 9
    ELSE NULL
  END) AS temp_c,
  AVG(CASE WHEN di.itemid = 220739 AND ce.valuenum BETWEEN 1 AND 4 THEN ce.valuenum END) AS gcs_eye,
  AVG(CASE WHEN di.itemid = 223900 AND ce.valuenum BETWEEN 1 AND 5 THEN ce.valuenum END) AS gcs_verbal,
  AVG(CASE WHEN di.itemid = 223901 AND ce.valuenum BETWEEN 1 AND 6 THEN ce.valuenum END) AS gcs_motor,
  AVG(CASE
    WHEN di.itemid = 223835 AND ce.valuenum BETWEEN 0.2 AND 1.0 THEN ce.valuenum
    WHEN di.itemid = 223835 AND ce.valuenum BETWEEN 20 AND 100 THEN ce.valuenum / 100.0
    ELSE NULL
  END) AS fio2_frac,
  MAX(CASE WHEN di.itemid = 220224 AND ce.valuenum BETWEEN 20 AND 600 THEN ce.valuenum END) AS pao2_arterial
FROM `physionet-data.mimiciv_icu.chartevents` AS ce
INNER JOIN `physionet-data.mimiciv_icu.d_items` AS di
  ON ce.itemid = di.itemid
INNER JOIN foundation_cohort AS c
  ON ce.stay_id = c.stay_id
WHERE ce.charttime >= c.intime
  AND ce.charttime <= c.outtime
  AND ce.valuenum IS NOT NULL
GROUP BY ce.stay_id, hour_ts;

CREATE TEMP TABLE hourly_labs AS
SELECT
  c.stay_id,
  TIMESTAMP_TRUNC(le.charttime, HOUR) AS hour_ts,
  MAX(CASE WHEN UPPER(dl.label) = 'LACTATE' AND le.valuenum BETWEEN 0.2 AND 30 THEN le.valuenum END) AS lactate,
  MAX(CASE WHEN UPPER(dl.label) = 'CREATININE' AND le.valuenum BETWEEN 0.1 AND 20 THEN le.valuenum END) AS creatinine,
  MIN(CASE WHEN UPPER(dl.label) = 'PLATELET COUNT' AND le.valuenum BETWEEN 1 AND 2000 THEN le.valuenum END) AS platelets,
  MAX(CASE WHEN UPPER(dl.label) = 'BILIRUBIN, TOTAL' AND le.valuenum BETWEEN 0.1 AND 50 THEN le.valuenum END) AS bilirubin_total,
  MAX(CASE
    WHEN UPPER(dl.label) = 'PO2' AND UPPER(COALESCE(dl.fluid, '')) = 'BLOOD' AND le.valuenum BETWEEN 20 AND 600 THEN le.valuenum
    ELSE NULL
  END) AS pao2_lab
FROM foundation_cohort AS c
INNER JOIN `physionet-data.mimiciv_hosp.labevents` AS le
  ON c.hadm_id = le.hadm_id
INNER JOIN `physionet-data.mimiciv_hosp.d_labitems` AS dl
  ON le.itemid = dl.itemid
WHERE le.charttime >= c.intime
  AND le.charttime <= c.outtime
  AND le.valuenum IS NOT NULL
GROUP BY c.stay_id, hour_ts;

CREATE TEMP TABLE hourly_urine AS
SELECT
  c.stay_id,
  TIMESTAMP_TRUNC(oe.charttime, HOUR) AS hour_ts,
  SUM(CASE WHEN oe.value BETWEEN 0 AND 3000 THEN oe.value END) AS urine_ml
FROM foundation_cohort AS c
INNER JOIN `physionet-data.mimiciv_icu.outputevents` AS oe
  ON c.stay_id = oe.stay_id
WHERE oe.charttime >= c.intime
  AND oe.charttime <= c.outtime
GROUP BY c.stay_id, hour_ts;

CREATE TEMP TABLE vasopressor_hours AS
SELECT
  ie.stay_id,
  ts AS hour_ts,
  1 AS vasopressor_active,
  MAX(IF(ts = TIMESTAMP_TRUNC(ie.starttime, HOUR), 1, 0)) AS vasopressor_start_hour
FROM `physionet-data.mimiciv_icu.inputevents` AS ie
INNER JOIN `physionet-data.mimiciv_icu.d_items` AS di
  ON ie.itemid = di.itemid
INNER JOIN foundation_cohort AS c
  ON ie.stay_id = c.stay_id,
UNNEST(
  GENERATE_TIMESTAMP_ARRAY(
    TIMESTAMP_TRUNC(ie.starttime, HOUR),
    TIMESTAMP_TRUNC(
      CASE
        WHEN ie.endtime IS NULL OR ie.endtime < ie.starttime THEN ie.starttime
        ELSE ie.endtime
      END,
      HOUR
    ),
    INTERVAL 1 HOUR
  )
) AS ts
WHERE ie.starttime >= c.intime
  AND ie.starttime <= c.outtime
  AND UPPER(di.label) IN ('NOREPINEPHRINE', 'EPINEPHRINE', 'VASOPRESSIN', 'PHENYLEPHRINE', 'DOPAMINE', 'DOBUTAMINE')
GROUP BY ie.stay_id, hour_ts;

CREATE TEMP TABLE ventilation_hours AS
SELECT
  pe.stay_id,
  ts AS hour_ts,
  1 AS vent_active
FROM `physionet-data.mimiciv_icu.procedureevents` AS pe
INNER JOIN `physionet-data.mimiciv_icu.d_items` AS di
  ON pe.itemid = di.itemid
INNER JOIN foundation_cohort AS c
  ON pe.stay_id = c.stay_id,
UNNEST(
  GENERATE_TIMESTAMP_ARRAY(
    TIMESTAMP_TRUNC(pe.starttime, HOUR),
    TIMESTAMP_TRUNC(
      CASE
        WHEN pe.endtime IS NULL OR pe.endtime < pe.starttime THEN pe.starttime
        ELSE pe.endtime
      END,
      HOUR
    ),
    INTERVAL 1 HOUR
  )
) AS ts
WHERE pe.starttime >= c.intime
  AND pe.starttime <= c.outtime
  AND UPPER(di.label) = 'VENTILATION'
GROUP BY pe.stay_id, hour_ts;

CREATE TEMP TABLE infection_times AS
WITH micro AS (
  SELECT
    hadm_id,
    MIN(TIMESTAMP_TRUNC(COALESCE(charttime, TIMESTAMP(chartdate)), HOUR)) AS culture_time
  FROM `physionet-data.mimiciv_hosp.microbiologyevents`
  GROUP BY hadm_id
),
emar_antibiotics AS (
  SELECT
    c.hadm_id,
    MIN(TIMESTAMP_TRUNC(e.charttime, HOUR)) AS antibiotic_admin_time
  FROM foundation_cohort AS c
  INNER JOIN `physionet-data.mimiciv_hosp.emar` AS e
    ON c.hadm_id = e.hadm_id
  WHERE REGEXP_CONTAINS(
      UPPER(COALESCE(e.medication, '')),
      r'VANCOMYCIN|CEFEPIME|CEFTRIAXONE|CEFTAZIDIME|PIPERACILLIN|TAZOBACTAM|MEROPENEM|IMIPENEM|ERTAPENEM|LEVOFLOXACIN|CIPROFLOXACIN|METRONIDAZOLE|AZTREONAM'
    )
    AND NOT REGEXP_CONTAINS(UPPER(COALESCE(e.event_txt, '')), r'NOT GIVEN|HELD|REFUSED|CANCELED|CANCELLED')
  GROUP BY c.hadm_id
),
prescription_antibiotics AS (
  SELECT
    hadm_id,
    MIN(TIMESTAMP_TRUNC(starttime, HOUR)) AS antibiotic_order_time
  FROM `physionet-data.mimiciv_hosp.prescriptions`
  WHERE UPPER(COALESCE(route, '')) = 'IV'
    AND REGEXP_CONTAINS(
      UPPER(drug),
      r'VANCOMYCIN|CEFEPIME|CEFTRIAXONE|CEFTAZIDIME|PIPERACILLIN|TAZOBACTAM|MEROPENEM|IMIPENEM|ERTAPENEM|LEVOFLOXACIN|CIPROFLOXACIN|METRONIDAZOLE|AZTREONAM'
    )
  GROUP BY hadm_id
),
infection_candidates AS (
  SELECT
    c.hadm_id,
    m.culture_time,
    ea.antibiotic_admin_time,
    pa.antibiotic_order_time,
    COALESCE(ea.antibiotic_admin_time, pa.antibiotic_order_time) AS antibiotic_time
  FROM foundation_cohort AS c
  LEFT JOIN micro AS m
    ON c.hadm_id = m.hadm_id
  LEFT JOIN emar_antibiotics AS ea
    ON c.hadm_id = ea.hadm_id
  LEFT JOIN prescription_antibiotics AS pa
    ON c.hadm_id = pa.hadm_id
)
SELECT
  hadm_id,
  culture_time,
  antibiotic_admin_time,
  antibiotic_order_time,
  antibiotic_time,
  LEAST(culture_time, antibiotic_time) AS infection_time
FROM infection_candidates
WHERE culture_time IS NOT NULL
  AND antibiotic_time IS NOT NULL
  AND antibiotic_time BETWEEN TIMESTAMP_SUB(culture_time, INTERVAL 24 HOUR)
                         AND TIMESTAMP_ADD(culture_time, INTERVAL 72 HOUR);

CREATE TEMP TABLE arrest_times AS
WITH timed_arrest AS (
  SELECT
    pe.stay_id,
    MIN(TIMESTAMP_TRUNC(pe.starttime, HOUR)) AS cardiac_arrest_time
  FROM `physionet-data.mimiciv_icu.procedureevents` AS pe
  INNER JOIN `physionet-data.mimiciv_icu.d_items` AS di
    ON pe.itemid = di.itemid
  INNER JOIN foundation_cohort AS c
    ON pe.stay_id = c.stay_id
  WHERE pe.starttime >= c.intime
    AND pe.starttime <= c.outtime
    AND UPPER(di.label) IN ('CARDIAC ARREST', 'CARDIOVERSION/DEFIBRILLATION')
  GROUP BY pe.stay_id
)
SELECT
  c.stay_id,
  ta.cardiac_arrest_time,
  COALESCE(dc.arrest_icd_flag, 0) AS arrest_icd_flag,
  COALESCE(pc.arrest_proc_icd_flag, 0) AS arrest_proc_icd_flag,
  COALESCE(dc.sepsis_icd_flag, 0) AS sepsis_icd_flag,
  COALESCE(pc.major_surgery_proc_icd_flag, 0) AS major_surgery_proc_icd_flag
FROM foundation_cohort AS c
LEFT JOIN timed_arrest AS ta
  ON c.stay_id = ta.stay_id
LEFT JOIN diagnosis_context AS dc
  ON c.hadm_id = dc.hadm_id
LEFT JOIN procedure_context AS pc
  ON c.hadm_id = pc.hadm_id;

CREATE TEMP TABLE hourly_state AS
WITH joined AS (
  SELECT
    g.subject_id,
    g.hadm_id,
    g.stay_id,
    g.intime,
    g.outtime,
    g.deathtime,
    g.hour_ts,
    v.hr,
    v.map_mean,
    v.sbp,
    v.rr,
    v.spo2,
    v.temp_c,
    (COALESCE(v.gcs_eye, 0) + COALESCE(v.gcs_verbal, 0) + COALESCE(v.gcs_motor, 0)) AS gcs_total,
    v.fio2_frac,
    COALESCE(v.pao2_arterial, l.pao2_lab) AS pao2,
    l.lactate,
    l.creatinine,
    l.platelets,
    l.bilirubin_total,
    u.urine_ml,
    COALESCE(vp.vasopressor_active, 0) AS vasopressor_active,
    COALESCE(vp.vasopressor_start_hour, 0) AS vasopressor_start_hour,
    COALESCE(vh.vent_active, 0) AS vent_active,
    it.infection_time,
    at.cardiac_arrest_time,
    at.arrest_icd_flag,
    at.arrest_proc_icd_flag,
    at.sepsis_icd_flag,
    at.major_surgery_proc_icd_flag,
    IF(g.deathtime IS NOT NULL AND g.deathtime <= g.outtime, TIMESTAMP_TRUNC(g.deathtime, HOUR), NULL) AS death_time,
    TIMESTAMP_TRUNC(g.outtime, HOUR) AS discharge_time
  FROM hourly_grid AS g
  LEFT JOIN hourly_vitals AS v
    ON g.stay_id = v.stay_id AND g.hour_ts = v.hour_ts
  LEFT JOIN hourly_labs AS l
    ON g.stay_id = l.stay_id AND g.hour_ts = l.hour_ts
  LEFT JOIN hourly_urine AS u
    ON g.stay_id = u.stay_id AND g.hour_ts = u.hour_ts
  LEFT JOIN vasopressor_hours AS vp
    ON g.stay_id = vp.stay_id AND g.hour_ts = vp.hour_ts
  LEFT JOIN ventilation_hours AS vh
    ON g.stay_id = vh.stay_id AND g.hour_ts = vh.hour_ts
  LEFT JOIN infection_times AS it
    ON g.hadm_id = it.hadm_id
  LEFT JOIN arrest_times AS at
    ON g.stay_id = at.stay_id
),
derived AS (
  SELECT
    j.*,
    CASE
      WHEN fio2_frac IS NOT NULL AND fio2_frac > 0 AND pao2 IS NOT NULL THEN pao2 / fio2_frac
      ELSE NULL
    END AS pf_ratio,
    CASE
      WHEN sbp IS NOT NULL AND sbp > 0 AND hr IS NOT NULL THEN hr / sbp
      ELSE NULL
    END AS shock_index
  FROM joined AS j
),
sofa_scores AS (
  SELECT
    d.*,
    CASE
      WHEN platelets IS NULL THEN 0
      WHEN platelets < 20 THEN 4
      WHEN platelets < 50 THEN 3
      WHEN platelets < 100 THEN 2
      WHEN platelets < 150 THEN 1
      ELSE 0
    END AS sofa_coag,
    CASE
      WHEN bilirubin_total IS NULL THEN 0
      WHEN bilirubin_total >= 12 THEN 4
      WHEN bilirubin_total >= 6 THEN 3
      WHEN bilirubin_total >= 2 THEN 2
      WHEN bilirubin_total >= 1.2 THEN 1
      ELSE 0
    END AS sofa_liver,
    CASE
      WHEN creatinine IS NULL AND urine_ml IS NULL THEN 0
      WHEN creatinine >= 5 OR urine_ml < 200 THEN 4
      WHEN creatinine >= 3.5 OR urine_ml < 500 THEN 3
      WHEN creatinine >= 2 THEN 2
      WHEN creatinine >= 1.2 THEN 1
      ELSE 0
    END AS sofa_renal,
    CASE
      WHEN vasopressor_active = 1 THEN 3
      WHEN map_mean < 70 THEN 1
      ELSE 0
    END AS sofa_cardio,
    CASE
      WHEN gcs_total = 0 THEN 0
      WHEN gcs_total < 6 THEN 4
      WHEN gcs_total < 10 THEN 3
      WHEN gcs_total < 13 THEN 2
      WHEN gcs_total < 15 THEN 1
      ELSE 0
    END AS sofa_cns,
    CASE
      WHEN pf_ratio IS NULL THEN 0
      WHEN pf_ratio < 100 AND vent_active = 1 THEN 4
      WHEN pf_ratio < 200 AND vent_active = 1 THEN 3
      WHEN pf_ratio < 300 THEN 2
      WHEN pf_ratio < 400 THEN 1
      ELSE 0
    END AS sofa_resp
  FROM derived AS d
),
with_sofa AS (
  SELECT
    s.*,
    (sofa_resp + sofa_coag + sofa_liver + sofa_renal + sofa_cardio + sofa_cns) AS sofa_approx,
    MIN(sofa_resp + sofa_coag + sofa_liver + sofa_renal + sofa_cardio + sofa_cns)
      OVER (PARTITION BY stay_id ORDER BY hour_ts ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS baseline_sofa_approx,
    LAG(map_mean, 1) OVER (PARTITION BY stay_id ORDER BY hour_ts) AS prev_map_1h,
    LAG(shock_index, 1) OVER (PARTITION BY stay_id ORDER BY hour_ts) AS prev_shock_index_1h
  FROM sofa_scores AS s
)
SELECT
  *,
  IF(
    infection_time IS NOT NULL
    AND hour_ts BETWEEN TIMESTAMP_SUB(infection_time, INTERVAL 24 HOUR)
                    AND TIMESTAMP_ADD(infection_time, INTERVAL 24 HOUR)
    AND sofa_approx - baseline_sofa_approx >= 2,
    1,
    0
  ) AS sepsis_flag,
  IF(
    infection_time IS NOT NULL
    AND map_mean < 65
    AND vasopressor_active = 1
    AND lactate > 2,
    1,
    0
  ) AS septic_shock_flag,
  IF(
    (
      map_mean < 60
      AND prev_map_1h < 60
    )
    OR (
      shock_index > 1
      AND prev_shock_index_1h > 1
    )
    OR (
      vasopressor_start_hour = 1
      AND (map_mean < 65 OR lactate > 2)
    ),
    1,
    0
  ) AS hemodynamic_collapse_flag
FROM with_sofa;

CREATE TEMP TABLE event_times AS
SELECT
  s.stay_id,
  MIN(IF(sepsis_flag = 1, hour_ts, NULL)) AS sepsis_time,
  MIN(IF(septic_shock_flag = 1, hour_ts, NULL)) AS shock_time,
  MIN(IF(hemodynamic_collapse_flag = 1, hour_ts, NULL)) AS collapse_time,
  MIN(cardiac_arrest_time) AS arrest_time,
  MIN(death_time) AS death_time,
  MIN(discharge_time) AS discharge_time,
  MAX(sepsis_icd_flag) AS sepsis_icd_flag,
  MAX(arrest_icd_flag) AS arrest_icd_flag,
  MAX(arrest_proc_icd_flag) AS arrest_proc_icd_flag,
  MAX(major_surgery_proc_icd_flag) AS major_surgery_proc_icd_flag
FROM hourly_state AS s
GROUP BY s.stay_id;

CREATE TEMP TABLE event_stream AS
SELECT stay_id, sepsis_time AS event_time, 'sepsis' AS event_type FROM event_times WHERE sepsis_time IS NOT NULL
UNION ALL
SELECT stay_id, shock_time, 'shock' FROM event_times WHERE shock_time IS NOT NULL
UNION ALL
SELECT stay_id, collapse_time, 'collapse' FROM event_times WHERE collapse_time IS NOT NULL
UNION ALL
SELECT stay_id, arrest_time, 'arrest' FROM event_times WHERE arrest_time IS NOT NULL
UNION ALL
SELECT stay_id, death_time, 'death' FROM event_times WHERE death_time IS NOT NULL
UNION ALL
SELECT stay_id, discharge_time, 'discharge' FROM event_times WHERE discharge_time IS NOT NULL;

-- 3) TEMPORAL DATASET CONSTRUCTION ------------------------------------------
CREATE OR REPLACE TABLE `your_project.your_dataset.icu_temporal_multievent_1h` AS
WITH features AS (
  SELECT
    s.subject_id,
    s.hadm_id,
    s.stay_id,
    s.intime,
    s.outtime,
    s.hour_ts,
    s.hr,
    s.map_mean,
    s.sbp,
    s.rr,
    s.spo2,
    s.temp_c,
    s.gcs_total,
    s.fio2_frac,
    s.pao2,
    s.pf_ratio,
    s.vent_active,
    s.lactate,
    s.creatinine,
    s.platelets,
    s.bilirubin_total,
    s.urine_ml,
    s.vasopressor_active,
    s.shock_index,
    s.sofa_resp,
    s.sofa_coag,
    s.sofa_liver,
    s.sofa_renal,
    s.sofa_cardio,
    s.sofa_cns,
    s.sofa_approx,
    AVG(s.hr) OVER w AS hr_mean_12h,
    MIN(s.map_mean) OVER w AS map_min_12h,
    AVG(s.map_mean) OVER w AS map_mean_12h,
    MAX(s.lactate) OVER w AS lactate_max_12h,
    MAX(s.creatinine) OVER w AS creatinine_max_12h,
    MIN(s.platelets) OVER w AS platelets_min_12h,
    MAX(s.bilirubin_total) OVER w AS bilirubin_max_12h,
    SUM(s.urine_ml) OVER w AS urine_sum_12h,
    MAX(CAST(s.vasopressor_active AS INT64)) OVER w AS vasopressor_any_12h,
    MAX(CAST(s.vent_active AS INT64)) OVER w AS vent_any_12h,
    MAX(s.sofa_approx) OVER w AS sofa_max_12h,
    COUNT(*) OVER w AS observed_hours_in_window
  FROM hourly_state AS s
  WINDOW w AS (
    PARTITION BY s.stay_id
    ORDER BY s.hour_ts
    ROWS BETWEEN 11 PRECEDING AND CURRENT ROW
  )
),
future_events AS (
  SELECT
    f.*,
    (
      SELECT AS STRUCT es.event_type, es.event_time
      FROM event_stream AS es
      WHERE es.stay_id = f.stay_id
        AND es.event_time > f.hour_ts
        AND es.event_time <= TIMESTAMP_ADD(f.hour_ts, INTERVAL horizon_2h HOUR)
      ORDER BY es.event_time,
        CASE es.event_type
          WHEN 'death' THEN 1
          WHEN 'arrest' THEN 2
          WHEN 'shock' THEN 3
          WHEN 'sepsis' THEN 4
          WHEN 'collapse' THEN 5
          WHEN 'discharge' THEN 6
          ELSE 99
        END
      LIMIT 1
    ) AS next_event_2h,
    (
      SELECT AS STRUCT es.event_type, es.event_time
      FROM event_stream AS es
      WHERE es.stay_id = f.stay_id
        AND es.event_time > f.hour_ts
        AND es.event_time <= TIMESTAMP_ADD(f.hour_ts, INTERVAL horizon_6h HOUR)
      ORDER BY es.event_time,
        CASE es.event_type
          WHEN 'death' THEN 1
          WHEN 'arrest' THEN 2
          WHEN 'shock' THEN 3
          WHEN 'sepsis' THEN 4
          WHEN 'collapse' THEN 5
          WHEN 'discharge' THEN 6
          ELSE 99
        END
      LIMIT 1
    ) AS next_event_6h,
    (
      SELECT AS STRUCT es.event_type, es.event_time
      FROM event_stream AS es
      WHERE es.stay_id = f.stay_id
        AND es.event_time > f.hour_ts
        AND es.event_time <= TIMESTAMP_ADD(f.hour_ts, INTERVAL horizon_12h HOUR)
      ORDER BY es.event_time,
        CASE es.event_type
          WHEN 'death' THEN 1
          WHEN 'arrest' THEN 2
          WHEN 'shock' THEN 3
          WHEN 'sepsis' THEN 4
          WHEN 'collapse' THEN 5
          WHEN 'discharge' THEN 6
          ELSE 99
        END
      LIMIT 1
    ) AS next_event_12h
  FROM features AS f
)
SELECT
  subject_id,
  hadm_id,
  stay_id,
  ABS(MOD(FARM_FINGERPRINT(CAST(subject_id AS STRING)), 100)) AS patient_split_bucket,
  hour_ts AS prediction_time,
  hr,
  map_mean,
  sbp,
  rr,
  spo2,
  temp_c,
  gcs_total,
  fio2_frac,
  pao2,
  pf_ratio,
  vent_active,
  lactate,
  creatinine,
  platelets,
  bilirubin_total,
  urine_ml,
  vasopressor_active,
  shock_index,
  sofa_resp,
  sofa_coag,
  sofa_liver,
  sofa_renal,
  sofa_cardio,
  sofa_cns,
  sofa_approx,
  hr_mean_12h,
  map_min_12h,
  map_mean_12h,
  lactate_max_12h,
  creatinine_max_12h,
  platelets_min_12h,
  bilirubin_max_12h,
  urine_sum_12h,
  vasopressor_any_12h,
  vent_any_12h,
  sofa_max_12h,
  CASE WHEN next_event_2h.event_type IS NULL THEN 0 ELSE 1 END AS label_2h,
  CASE WHEN next_event_6h.event_type IS NULL THEN 0 ELSE 1 END AS label_6h,
  CASE WHEN next_event_12h.event_type IS NULL THEN 0 ELSE 1 END AS label_12h,
  COALESCE(next_event_2h.event_type, 'none') AS event_type_2h,
  COALESCE(next_event_6h.event_type, 'none') AS event_type_6h,
  COALESCE(next_event_12h.event_type, 'none') AS event_type_12h,
  next_event_2h.event_time AS event_time_2h,
  next_event_6h.event_time AS event_time_6h,
  next_event_12h.event_time AS event_time_12h,
  window_hours AS observation_window_hours
FROM future_events
WHERE TIMESTAMP_DIFF(hour_ts, intime, HOUR) >= window_hours - 1
  AND observed_hours_in_window = window_hours;

-- 4) PHENOTYPE SUMMARY FOR PAPER-STYLE VALIDATION ----------------------------
CREATE OR REPLACE TABLE `your_project.your_dataset.icu_temporal_multievent_1h_summary` AS
SELECT
  COUNT(*) AS n_icu_stays,
  SUM(CASE WHEN c.dnr_or_comfort_flag = 1 THEN 1 ELSE 0 END) AS n_dnr_or_comfort_flagged,
  SUM(CASE WHEN e.sepsis_time IS NOT NULL THEN 1 ELSE 0 END) AS n_sepsis,
  SUM(CASE WHEN e.shock_time IS NOT NULL THEN 1 ELSE 0 END) AS n_septic_shock,
  SUM(CASE WHEN e.collapse_time IS NOT NULL THEN 1 ELSE 0 END) AS n_hemodynamic_collapse,
  SUM(CASE WHEN e.arrest_time IS NOT NULL THEN 1 ELSE 0 END) AS n_cardiac_arrest_timed,
  SUM(CASE WHEN e.death_time IS NOT NULL THEN 1 ELSE 0 END) AS n_death,
  SUM(CASE WHEN e.sepsis_time IS NOT NULL AND e.sepsis_icd_flag = 1 THEN 1 ELSE 0 END) AS n_sepsis_with_icd_support,
  SUM(CASE WHEN e.arrest_time IS NOT NULL AND (e.arrest_icd_flag = 1 OR e.arrest_proc_icd_flag = 1) THEN 1 ELSE 0 END) AS n_arrest_with_icd_or_proc_support,
  AVG(c.hospital_transfer_count) AS mean_hospital_transfer_count,
  AVG(c.post_icu_transfer_count) AS mean_post_icu_transfer_count,
  APPROX_QUANTILES(IF(e.sepsis_time IS NOT NULL, TIMESTAMP_DIFF(e.sepsis_time, c.intime, HOUR), NULL), 2)[OFFSET(1)] AS median_hours_to_sepsis,
  APPROX_QUANTILES(IF(e.shock_time IS NOT NULL, TIMESTAMP_DIFF(e.shock_time, c.intime, HOUR), NULL), 2)[OFFSET(1)] AS median_hours_to_shock,
  APPROX_QUANTILES(IF(e.collapse_time IS NOT NULL, TIMESTAMP_DIFF(e.collapse_time, c.intime, HOUR), NULL), 2)[OFFSET(1)] AS median_hours_to_collapse,
  APPROX_QUANTILES(IF(e.arrest_time IS NOT NULL, TIMESTAMP_DIFF(e.arrest_time, c.intime, HOUR), NULL), 2)[OFFSET(1)] AS median_hours_to_arrest,
  APPROX_QUANTILES(IF(e.death_time IS NOT NULL, TIMESTAMP_DIFF(e.death_time, c.intime, HOUR), NULL), 2)[OFFSET(1)] AS median_hours_to_death
FROM foundation_cohort AS c
LEFT JOIN event_times AS e
  ON c.stay_id = e.stay_id;