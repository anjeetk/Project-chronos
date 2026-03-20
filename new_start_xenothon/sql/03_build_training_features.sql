-- BigQuery Standard SQL
-- Builds first-24h aggregate features for model training from the filtered cohort.
-- Replace destination table with your own BigQuery dataset.

CREATE OR REPLACE TABLE `your_project.your_dataset.training_features_first24h` AS
WITH cohort AS (
  SELECT *
  FROM `your_project.your_dataset.filtered_icu_cohort`
),
clean_vitals AS (
  SELECT
    c.stay_id,
    c.subject_id,
    c.hadm_id,
    ce.charttime,
    CASE
      WHEN UPPER(di.label) = 'HEART RATE'
        AND ce.valuenum BETWEEN 20 AND 250 THEN 'heart_rate'
      WHEN UPPER(di.label) IN (
        'NON INVASIVE BLOOD PRESSURE SYSTOLIC',
        'ARTERIAL BLOOD PRESSURE SYSTOLIC'
      )
        AND ce.valuenum BETWEEN 40 AND 300 THEN 'sbp'
      WHEN UPPER(di.label) IN (
        'NON INVASIVE BLOOD PRESSURE MEAN',
        'ARTERIAL BLOOD PRESSURE MEAN'
      )
        AND ce.valuenum BETWEEN 20 AND 220 THEN 'mbp'
      WHEN UPPER(di.label) = 'RESPIRATORY RATE'
        AND ce.valuenum BETWEEN 4 AND 80 THEN 'resp_rate'
      WHEN UPPER(di.label) = 'TEMPERATURE CELSIUS'
        AND ce.valuenum BETWEEN 30 AND 43 THEN 'temperature_c'
      WHEN UPPER(di.label) = 'TEMPERATURE FAHRENHEIT'
        AND ce.valuenum BETWEEN 86 AND 109.4 THEN 'temperature_c'
      WHEN UPPER(di.label) IN ('O2 SATURATION PULSEOXIMETRY', 'SPO2')
        AND ce.valuenum BETWEEN 40 AND 100 THEN 'spo2'
      ELSE NULL
    END AS feature_name,
    CASE
      WHEN UPPER(di.label) = 'TEMPERATURE FAHRENHEIT'
        AND ce.valuenum BETWEEN 86 AND 109.4 THEN (ce.valuenum - 32) * 5 / 9
      ELSE ce.valuenum
    END AS feature_value
  FROM cohort AS c
  INNER JOIN `physionet-data.mimiciv_icu.chartevents` AS ce
    ON c.stay_id = ce.stay_id
  INNER JOIN `physionet-data.mimiciv_icu.d_items` AS di
    ON ce.itemid = di.itemid
  WHERE ce.charttime >= c.intime
    AND ce.charttime < TIMESTAMP_ADD(c.intime, INTERVAL 24 HOUR)
    AND ce.valuenum IS NOT NULL
),
vital_features AS (
  SELECT
    stay_id,
    MAX(IF(feature_name = 'heart_rate', feature_value, NULL)) AS heart_rate_max,
    MIN(IF(feature_name = 'heart_rate', feature_value, NULL)) AS heart_rate_min,
    AVG(IF(feature_name = 'heart_rate', feature_value, NULL)) AS heart_rate_mean,
    MAX(IF(feature_name = 'sbp', feature_value, NULL)) AS sbp_max,
    MIN(IF(feature_name = 'sbp', feature_value, NULL)) AS sbp_min,
    AVG(IF(feature_name = 'sbp', feature_value, NULL)) AS sbp_mean,
    MAX(IF(feature_name = 'mbp', feature_value, NULL)) AS mbp_max,
    MIN(IF(feature_name = 'mbp', feature_value, NULL)) AS mbp_min,
    AVG(IF(feature_name = 'mbp', feature_value, NULL)) AS mbp_mean,
    MAX(IF(feature_name = 'resp_rate', feature_value, NULL)) AS resp_rate_max,
    MIN(IF(feature_name = 'resp_rate', feature_value, NULL)) AS resp_rate_min,
    AVG(IF(feature_name = 'resp_rate', feature_value, NULL)) AS resp_rate_mean,
    MAX(IF(feature_name = 'temperature_c', feature_value, NULL)) AS temperature_c_max,
    MIN(IF(feature_name = 'temperature_c', feature_value, NULL)) AS temperature_c_min,
    AVG(IF(feature_name = 'temperature_c', feature_value, NULL)) AS temperature_c_mean,
    MAX(IF(feature_name = 'spo2', feature_value, NULL)) AS spo2_max,
    MIN(IF(feature_name = 'spo2', feature_value, NULL)) AS spo2_min,
    AVG(IF(feature_name = 'spo2', feature_value, NULL)) AS spo2_mean
  FROM clean_vitals
  WHERE feature_name IS NOT NULL
  GROUP BY stay_id
),
clean_labs AS (
  SELECT
    c.stay_id,
    CASE
      WHEN UPPER(dl.label) = 'CREATININE' AND le.valuenum BETWEEN 0.1 AND 20 THEN 'creatinine'
      WHEN UPPER(dl.label) = 'LACTATE' AND le.valuenum BETWEEN 0.2 AND 30 THEN 'lactate'
      WHEN UPPER(dl.label) IN ('WHITE BLOOD CELLS', 'WBC') AND le.valuenum BETWEEN 0.1 AND 200 THEN 'wbc'
      WHEN UPPER(dl.label) = 'HEMOGLOBIN' AND le.valuenum BETWEEN 1 AND 25 THEN 'hemoglobin'
      ELSE NULL
    END AS feature_name,
    le.valuenum AS feature_value
  FROM cohort AS c
  INNER JOIN `physionet-data.mimiciv_hosp.labevents` AS le
    ON c.hadm_id = le.hadm_id
  INNER JOIN `physionet-data.mimiciv_hosp.d_labitems` AS dl
    ON le.itemid = dl.itemid
  WHERE le.charttime >= c.intime
    AND le.charttime < TIMESTAMP_ADD(c.intime, INTERVAL 24 HOUR)
    AND le.valuenum IS NOT NULL
),
lab_features AS (
  SELECT
    stay_id,
    MAX(IF(feature_name = 'creatinine', feature_value, NULL)) AS creatinine_max,
    MIN(IF(feature_name = 'creatinine', feature_value, NULL)) AS creatinine_min,
    AVG(IF(feature_name = 'creatinine', feature_value, NULL)) AS creatinine_mean,
    MAX(IF(feature_name = 'lactate', feature_value, NULL)) AS lactate_max,
    MIN(IF(feature_name = 'lactate', feature_value, NULL)) AS lactate_min,
    AVG(IF(feature_name = 'lactate', feature_value, NULL)) AS lactate_mean,
    MAX(IF(feature_name = 'wbc', feature_value, NULL)) AS wbc_max,
    MIN(IF(feature_name = 'wbc', feature_value, NULL)) AS wbc_min,
    AVG(IF(feature_name = 'wbc', feature_value, NULL)) AS wbc_mean,
    MAX(IF(feature_name = 'hemoglobin', feature_value, NULL)) AS hemoglobin_max,
    MIN(IF(feature_name = 'hemoglobin', feature_value, NULL)) AS hemoglobin_min,
    AVG(IF(feature_name = 'hemoglobin', feature_value, NULL)) AS hemoglobin_mean
  FROM clean_labs
  WHERE feature_name IS NOT NULL
  GROUP BY stay_id
),
urine_output AS (
  SELECT
    c.stay_id,
    SUM(
      CASE
        WHEN oe.value BETWEEN 0 AND 12000 THEN oe.value
        ELSE NULL
      END
    ) AS urine_output_ml_24h
  FROM cohort AS c
  LEFT JOIN `physionet-data.mimiciv_icu.outputevents` AS oe
    ON c.stay_id = oe.stay_id
  WHERE oe.charttime >= c.intime
    AND oe.charttime < TIMESTAMP_ADD(c.intime, INTERVAL 24 HOUR)
  GROUP BY c.stay_id
)
SELECT
  c.subject_id,
  c.hadm_id,
  c.stay_id,
  c.gender,
  c.anchor_age,
  c.first_careunit,
  c.icu_los_hours,
  c.hospital_expire_flag AS label_in_hospital_mortality,
  c.dnr_or_comfort_flag,
  c.elective_surgery_flag,
  vf.heart_rate_min,
  vf.heart_rate_mean,
  vf.heart_rate_max,
  vf.sbp_min,
  vf.sbp_mean,
  vf.sbp_max,
  vf.mbp_min,
  vf.mbp_mean,
  vf.mbp_max,
  vf.resp_rate_min,
  vf.resp_rate_mean,
  vf.resp_rate_max,
  vf.temperature_c_min,
  vf.temperature_c_mean,
  vf.temperature_c_max,
  vf.spo2_min,
  vf.spo2_mean,
  vf.spo2_max,
  lf.creatinine_min,
  lf.creatinine_mean,
  lf.creatinine_max,
  lf.lactate_min,
  lf.lactate_mean,
  lf.lactate_max,
  lf.wbc_min,
  lf.wbc_mean,
  lf.wbc_max,
  lf.hemoglobin_min,
  lf.hemoglobin_mean,
  lf.hemoglobin_max,
  uo.urine_output_ml_24h
FROM cohort AS c
LEFT JOIN vital_features AS vf
  ON c.stay_id = vf.stay_id
LEFT JOIN lab_features AS lf
  ON c.stay_id = lf.stay_id
LEFT JOIN urine_output AS uo
  ON c.stay_id = uo.stay_id;
