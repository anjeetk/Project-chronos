import pandas as pd
df = pd.read_csv('c:/Users/anjee/Desktop/Project-chronos/datasets_13339.csv', nrows=1)
print(",".join(df.columns.tolist()))
