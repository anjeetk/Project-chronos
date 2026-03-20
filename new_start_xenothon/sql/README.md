These queries are written for BigQuery Standard SQL against the public MIMIC-IV tables:

- `physionet-data.mimiciv_hosp.*`
- `physionet-data.mimiciv_icu.*`

Before running them, replace destination table names such as:

- `your_project.your_dataset.filtered_icu_cohort`
- `your_project.your_dataset.training_features_first24h`

Files:

- `01_bigquery_table_inventory.sql`: inspect available MIMIC-IV tables and columns.
- `02_build_filtered_icu_cohort.sql`: build the ICU cohort with your requested clinical and bias-removal filters.
- `03_build_training_features.sql`: derive a Kaggle-friendly training table from the filtered cohort using first-24h vitals/labs.

Important notes:

- I did not assume any unseen schema image. I used the core MIMIC-IV ICU and hospital tables present in your folder.
- `DNR` and comfort-care filtering is included as a flag and optional exclusion because code-status capture in MIMIC can vary by charting practice.
- "Missing-data heavy" is operationalized using first-24h trajectory coverage of key vitals and labs, which is more defensible than raw row-count filtering.
