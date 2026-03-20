-- BigQuery Standard SQL
-- Replace destination table with your own BigQuery dataset.

CREATE OR REPLACE TABLE `your_project.your_dataset.filtered_icu_cohort` AS
WITH parameters AS (
  SELECT
    24 AS min_icu_hours,
    24 AS early_death_hours,
    TRUE AS exclude_elective_surgery,
    FALSE AS exclude_dnr_and_comfort_care,
    4 AS min_vital_types_in_first_24h,
    2 AS min_lab_types_in_first_24h
),
base AS (
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
    pat.dod,
    ROW_NUMBER() OVER (PARTITION BY icu.subject_id ORDER BY icu.intime) AS icu_seq,
    ROW_NUMBER() OVER (PARTITION BY adm.subject_id ORDER BY adm.admittime) AS hospital_adm_seq,
    COUNT(DISTINCT adm.hadm_id) OVER (PARTITION BY adm.subject_id) AS total_hospital_admissions
  FROM `physionet-data.mimiciv_icu.icustays` AS icu
  INNER JOIN `physionet-data.mimiciv_hosp.admissions` AS adm
    ON icu.hadm_id = adm.hadm_id
  INNER JOIN `physionet-data.mimiciv_hosp.patients` AS pat
    ON icu.subject_id = pat.subject_id
),
code_status_flags AS (
  SELECT
    ce.stay_id,
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
vital_coverage AS (
  SELECT
    ce.stay_id,
    COUNT(DISTINCT
      CASE
        WHEN UPPER(di.label) = 'HEART RATE' THEN 'heart_rate'
        WHEN UPPER(di.label) IN (
          'NON INVASIVE BLOOD PRESSURE SYSTOLIC',
          'ARTERIAL BLOOD PRESSURE SYSTOLIC'
        ) THEN 'sbp'
        WHEN UPPER(di.label) IN (
          'NON INVASIVE BLOOD PRESSURE MEAN',
          'ARTERIAL BLOOD PRESSURE MEAN'
        ) THEN 'mbp'
        WHEN UPPER(di.label) = 'RESPIRATORY RATE' THEN 'resp_rate'
        WHEN UPPER(di.label) IN ('TEMPERATURE CELSIUS', 'TEMPERATURE FAHRENHEIT') THEN 'temperature'
        WHEN UPPER(di.label) IN ('O2 SATURATION PULSEOXIMETRY', 'SPO2') THEN 'spo2'
        ELSE NULL
      END
    ) AS vital_types_present
  FROM `physionet-data.mimiciv_icu.chartevents` AS ce
  INNER JOIN `physionet-data.mimiciv_icu.d_items` AS di
    ON ce.itemid = di.itemid
  INNER JOIN base AS b
    ON ce.stay_id = b.stay_id
  WHERE ce.charttime >= b.intime
    AND ce.charttime < TIMESTAMP_ADD(b.intime, INTERVAL 24 HOUR)
    AND ce.valuenum IS NOT NULL
    AND (
      UPPER(di.label) = 'HEART RATE'
      OR UPPER(di.label) IN (
        'NON INVASIVE BLOOD PRESSURE SYSTOLIC',
        'ARTERIAL BLOOD PRESSURE SYSTOLIC',
        'NON INVASIVE BLOOD PRESSURE MEAN',
        'ARTERIAL BLOOD PRESSURE MEAN',
        'RESPIRATORY RATE',
        'TEMPERATURE CELSIUS',
        'TEMPERATURE FAHRENHEIT',
        'O2 SATURATION PULSEOXIMETRY',
        'SPO2'
      )
    )
  GROUP BY ce.stay_id
),
lab_coverage AS (
  SELECT
    b.stay_id,
    COUNT(DISTINCT
      CASE
        WHEN UPPER(dl.label) IN ('CREATININE', 'LACTATE', 'WHITE BLOOD CELLS', 'WBC', 'HEMOGLOBIN') THEN UPPER(dl.label)
        ELSE NULL
      END
    ) AS lab_types_present
  FROM base AS b
  INNER JOIN `physionet-data.mimiciv_hosp.labevents` AS le
    ON b.hadm_id = le.hadm_id
  INNER JOIN `physionet-data.mimiciv_hosp.d_labitems` AS dl
    ON le.itemid = dl.itemid
  WHERE le.charttime >= b.intime
    AND le.charttime < TIMESTAMP_ADD(b.intime, INTERVAL 24 HOUR)
    AND le.valuenum IS NOT NULL
    AND UPPER(dl.label) IN ('CREATININE', 'LACTATE', 'WHITE BLOOD CELLS', 'WBC', 'HEMOGLOBIN')
  GROUP BY b.stay_id
),
cohort AS (
  SELECT
    b.*,
    COALESCE(cs.dnr_or_comfort_flag, 0) AS dnr_or_comfort_flag,
    COALESCE(vc.vital_types_present, 0) AS vital_types_present,
    COALESCE(lc.lab_types_present, 0) AS lab_types_present,
    IF(
      b.deathtime IS NOT NULL
      AND TIMESTAMP_DIFF(b.deathtime, b.intime, HOUR) < (SELECT early_death_hours FROM parameters),
      1,
      0
    ) AS early_icu_death_flag,
    IF(
      REGEXP_CONTAINS(
        UPPER(COALESCE(b.discharge_location, '')),
        r'ACUTE HOSPITAL|OTHER HOSPITAL'
      ),
      1,
      0
    ) AS external_transfer_out_flag,
    IF(
      b.admission_type IN ('ELECTIVE', 'SURGICAL SAME DAY ADMISSION'),
      1,
      0
    ) AS elective_surgery_flag
  FROM base AS b
  LEFT JOIN code_status_flags AS cs
    ON b.stay_id = cs.stay_id
  LEFT JOIN vital_coverage AS vc
    ON b.stay_id = vc.stay_id
  LEFT JOIN lab_coverage AS lc
    ON b.stay_id = lc.stay_id
)
SELECT
  subject_id,
  hadm_id,
  stay_id,
  gender,
  anchor_age,
  intime,
  outtime,
  icu_los_hours,
  admittime,
  dischtime,
  deathtime,
  hospital_expire_flag,
  first_careunit,
  last_careunit,
  admission_type,
  admission_location,
  discharge_location,
  total_hospital_admissions,
  vital_types_present,
  lab_types_present,
  dnr_or_comfort_flag,
  early_icu_death_flag,
  external_transfer_out_flag,
  elective_surgery_flag
FROM cohort
WHERE anchor_age >= 18
  AND icu_seq = 1
  AND hospital_adm_seq = 1
  AND icu_los_hours >= (SELECT min_icu_hours FROM parameters)
  AND early_icu_death_flag = 0
  AND external_transfer_out_flag = 0
  AND vital_types_present >= (SELECT min_vital_types_in_first_24h FROM parameters)
  AND lab_types_present >= (SELECT min_lab_types_in_first_24h FROM parameters)
  AND (
    (SELECT exclude_elective_surgery FROM parameters) = FALSE
    OR elective_surgery_flag = 0
  )
  AND (
    (SELECT exclude_dnr_and_comfort_care FROM parameters) = FALSE
    OR dnr_or_comfort_flag = 0
  );
