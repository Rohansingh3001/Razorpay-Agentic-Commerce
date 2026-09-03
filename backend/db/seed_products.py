"""
Seed script to create and populate the `products` table in Neon DB.
Usage: python -m db.seed_products
"""
import asyncio
import os
import json
import asyncpg
from dotenv import load_dotenv

load_dotenv()

CATALOG = [
    {"id": "p1", "name": "Premium Cotton T-Shirt", "price": 1500, "category": "Apparel", "description": "High-quality, breathable cotton t-shirt in solid colors.", "inventory": 100, "attributes": {"material": "cotton"}, "compatible_product_ids": []},
    {"id": "p2", "name": "Wireless Noise-Canceling Headphones", "price": 3499, "category": "Electronics", "description": "Over-ear headphones with 30-hour battery life and active noise cancellation. Great microphone for work calls.", "inventory": 25, "attributes": {"microphone": "excellent", "anc": True, "battery_hours": 30}, "compatible_product_ids": ["p7"]},
    {"id": "p3", "name": "Smart Fitness Band", "price": 3000, "category": "Electronics", "description": "Tracks heart rate, steps, and sleep with OLED display.", "inventory": 50, "attributes": {"display": "OLED"}, "compatible_product_ids": []},
    {"id": "p4", "name": "Stainless Steel Water Bottle", "price": 800, "category": "Accessories", "description": "1L vacuum insulated bottle keeps drinks cold for 24 hours.", "inventory": 200, "attributes": {"capacity": "1L"}, "compatible_product_ids": []},
    {"id": "p5", "name": "Ergonomic Office Chair", "price": 8500, "category": "Furniture", "description": "Adjustable lumbar support and breathable mesh back.", "inventory": 10, "attributes": {"lumbar": True}, "compatible_product_ids": []},
    {"id": "p6", "name": "Mechanical Gaming Keyboard", "price": 4500, "category": "Electronics", "description": "RGB backlit keyboard with tactile mechanical switches.", "inventory": 30, "attributes": {"switches": "tactile"}, "compatible_product_ids": []},
    {"id": "p7", "name": "Headphone Carrying Case", "price": 299, "category": "Accessories", "description": "Hard shell carrying case compatible with wireless headphones.", "inventory": 150, "attributes": {"material": "EVA"}, "compatible_product_ids": []},
]

async def seed():
    print("Connecting to Neon DB...")
    conn = await asyncpg.connect(dsn=os.getenv("DATABASE_URL"), statement_cache_size=0)

    print("Creating `products` table...")
    await conn.execute("""
        DROP TABLE IF EXISTS products CASCADE;

        CREATE TABLE products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            price NUMERIC NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            inventory INT NOT NULL DEFAULT 10,
            attributes JSONB,
            compatible_product_ids JSONB
        );
    """)
    print("Table created.")

    print("Seeding products...")
    query = "INSERT INTO products (id, name, price, category, description, inventory, attributes, compatible_product_ids) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
    
    records = [(p["id"], p["name"], p["price"], p["category"], p["description"], p["inventory"], json.dumps(p["attributes"]), json.dumps(p["compatible_product_ids"])) for p in CATALOG]
    
    await conn.executemany(query, records)

    count = await conn.fetchval("SELECT COUNT(*) FROM products")
    print(f"\nSeed complete! {count} products added to Neon DB.")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(seed())
