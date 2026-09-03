import pandas as pd
import sys
import os

# This makes sure Python can find your app/ folder
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.core.database import engine

def import_csv(filepath, table_name):
    """
    Reads one CSV file and loads it into the matching PostgreSQL table.
    if_exists='append' means add rows, don't delete existing ones.
    index=False means don't write the pandas row numbers as a column.
    """
    df = pd.read_csv(filepath)

    # Strip whitespace from string columns
    # (your sku_master.csv had some whitespace in preferred_zone)
    df = df.apply(lambda col: col.str.strip() if col.dtype == "object" else col)

    df.to_sql(table_name, engine, if_exists="append", index=False)
    print(f"✅ Imported {len(df)} rows into '{table_name}'")


def run():
    print("Starting CSV import...\n")
    
    # Locate datasets directory relative to project structure
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    datasets_dir = os.path.join(base_dir, "datasets")

    import_csv(os.path.join(datasets_dir, "warehouse_nodes.csv"), "warehouse_nodes")
    import_csv(os.path.join(datasets_dir, "warehouse_paths.csv"), "warehouse_paths")
    import_csv(os.path.join(datasets_dir, "sku_master.csv"),      "sku_master")
    import_csv(os.path.join(datasets_dir, "inventory.csv"),        "inventory")
    import_csv(os.path.join(datasets_dir, "orders.csv"),           "orders")
    import_csv(os.path.join(datasets_dir, "order_items.csv"),      "order_items")

    print("\n All CSVs imported successfully.")


if __name__ == "__main__":
    run()