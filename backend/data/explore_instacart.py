"""
Explore Instacart dataset structure before building the pipeline.
File encoding: UTF-16 (BOM detected at byte 0xff)
"""
import kagglehub
from kagglehub import KaggleDatasetAdapter
import pandas as pd

PK = {"encoding": "utf-16"}  # all files in this dataset are UTF-16

def load(filename):
    return kagglehub.dataset_load(
        KaggleDatasetAdapter.PANDAS,
        "yasserh/instacart-online-grocery-basket-analysis-dataset",
        filename,
        pandas_kwargs=PK,
    )

print("Loading orders...")
orders = load("orders.csv")
print("orders shape:", orders.shape)
print(orders.dtypes)
print(orders.head(3))
print()

print("Loading order_products__prior...")
op_prior = load("order_products__prior.csv")
print("op_prior shape:", op_prior.shape)
print(op_prior.dtypes)
print(op_prior.head(3))
print()

print("Loading products...")
products = load("products.csv")
print("products shape:", products.shape)
print(products.head(3))
print()

print("Loading departments...")
departments = load("departments.csv")
print(departments)
print()

print("Loading aisles...")
aisles = load("aisles.csv")
print(aisles.head())

# Sample one user's full order history
sample_user = orders['user_id'].iloc[0]
print(f"\nSample user {sample_user} orders:")
print(orders[orders['user_id'] == sample_user].sort_values('order_number'))
print("\ndone.")

