"""
Instacart Dataset Loader
Handles ZIP-encoded CSVs from the Kaggle cache.
"""
import zipfile
import os
import pandas as pd

CACHE_BASE = os.path.join(
    os.path.expanduser("~"),
    ".cache", "kagglehub", "datasets",
    "yasserh", "instacart-online-grocery-basket-analysis-dataset", "versions", "1"
)


def _read_zip_csv(filename: str, **kwargs) -> pd.DataFrame:
    path = os.path.join(CACHE_BASE, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"Dataset file not found: {path}\n"
            "Run: python -c \"import kagglehub; kagglehub.dataset_download('yasserh/instacart-online-grocery-basket-analysis-dataset', path='<filename>')\""
        )
    # Large files are ZIP-wrapped, small files are plain CSV
    try:
        with zipfile.ZipFile(path, "r") as z:
            with z.open(z.namelist()[0]) as f:
                return pd.read_csv(f, **kwargs)
    except zipfile.BadZipFile:
        return pd.read_csv(path, **kwargs)



def load_orders() -> pd.DataFrame:
    """order_id, user_id, eval_set, order_number, order_dow, order_hour_of_day, days_since_prior_order"""
    return _read_zip_csv("orders.csv")


def load_order_products_prior() -> pd.DataFrame:
    """order_id, product_id, add_to_cart_order, reordered"""
    return _read_zip_csv("order_products__prior.csv")


def load_products() -> pd.DataFrame:
    """product_id, product_name, aisle_id, department_id"""
    return _read_zip_csv("products.csv")


def load_departments() -> pd.DataFrame:
    """department_id, department"""
    return _read_zip_csv("departments.csv")


def load_aisles() -> pd.DataFrame:
    """aisle_id, aisle"""
    return _read_zip_csv("aisles.csv")
