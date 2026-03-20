-- BigQuery Standard SQL
-- Quick schema inventory for the main MIMIC-IV ICU/hospital tables.

WITH columns AS (
  SELECT
    'mimiciv_hosp' AS dataset_name,
    table_name,
    column_name,
    data_type,
    ordinal_position
  FROM `physionet-data.mimiciv_hosp.INFORMATION_SCHEMA.COLUMNS`
  WHERE table_name IN (
    'patients',
    'admissions',
    'transfers',
    'diagnoses_icd',
    'procedures_icd',
    'drgcodes',
    'labevents',
    'd_labitems'
  )

  UNION ALL

  SELECT
    'mimiciv_icu' AS dataset_name,
    table_name,
    column_name,
    data_type,
    ordinal_position
  FROM `physionet-data.mimiciv_icu.INFORMATION_SCHEMA.COLUMNS`
  WHERE table_name IN (
    'icustays',
    'chartevents',
    'inputevents',
    'outputevents',
    'procedureevents',
    'd_items'
  )
)
SELECT
  dataset_name,
  table_name,
  ordinal_position,
  column_name,
  data_type
FROM columns
ORDER BY dataset_name, table_name, ordinal_position;

-- Helpful row counts for quick sanity-checking:
SELECT 'patients' AS table_name, COUNT(*) AS row_count
FROM `physionet-data.mimiciv_hosp.patients`
UNION ALL
SELECT 'admissions', COUNT(*) FROM `physionet-data.mimiciv_hosp.admissions`
UNION ALL
SELECT 'transfers', COUNT(*) FROM `physionet-data.mimiciv_hosp.transfers`
UNION ALL
SELECT 'icustays', COUNT(*) FROM `physionet-data.mimiciv_icu.icustays`
UNION ALL
SELECT 'chartevents', COUNT(*) FROM `physionet-data.mimiciv_icu.chartevents`
UNION ALL
SELECT 'labevents', COUNT(*) FROM `physionet-data.mimiciv_hosp.labevents`;
