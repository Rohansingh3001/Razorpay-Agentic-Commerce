import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

async def seed():
    print("Connecting to Neon DB...")
    conn = await asyncpg.connect(dsn=os.getenv("DATABASE_URL"), statement_cache_size=0)

    print("Creating Agentic Commerce tables...")
    await conn.execute("""
        DROP TABLE IF EXISTS audit_events CASCADE;
        DROP TABLE IF EXISTS payment_orders CASCADE;
        DROP TABLE IF EXISTS purchase_requests CASCADE;
        DROP TABLE IF EXISTS cart_items CASCADE;
        DROP TABLE IF EXISTS carts CASCADE;
        DROP TABLE IF EXISTS agent_policies CASCADE;

        CREATE TABLE agent_policies (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
            user_id TEXT NOT NULL,
            auto_approve_limit NUMERIC NOT NULL DEFAULT 2000,
            hard_limit NUMERIC NOT NULL DEFAULT 5000,
            allowed_merchants JSONB,
            allowed_categories JSONB
        );

        CREATE TABLE carts (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
            user_id TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            quoted_total NUMERIC DEFAULT 0,
            discount_percent NUMERIC DEFAULT 0,
            discount_amount NUMERIC DEFAULT 0,
            quote_version INT DEFAULT 1,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );

        CREATE TABLE cart_items (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
            cart_id TEXT REFERENCES carts(id) ON DELETE CASCADE,
            product_id TEXT REFERENCES products(id),
            quantity INT NOT NULL DEFAULT 1,
            unit_price NUMERIC NOT NULL
        );

        CREATE TABLE purchase_requests (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
            cart_id TEXT REFERENCES carts(id),
            user_id TEXT NOT NULL,
            proposed_total NUMERIC NOT NULL,
            subtotal NUMERIC NOT NULL DEFAULT 0,
            discount_percent NUMERIC NOT NULL DEFAULT 0,
            discount_amount NUMERIC NOT NULL DEFAULT 0,
            metadata JSONB DEFAULT '{}'::jsonb,
            policy_decision TEXT,
            approval_status TEXT DEFAULT 'pending',
            reason TEXT,
            created_at TIMESTAMPTZ DEFAULT now()
        );

        CREATE TABLE payment_orders (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
            purchase_request_id TEXT REFERENCES purchase_requests(id),
            razorpay_order_id TEXT,
            amount NUMERIC NOT NULL,
            currency TEXT DEFAULT 'INR',
            payment_link TEXT,
            status TEXT DEFAULT 'created',
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );

        CREATE TABLE audit_events (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
            session_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            actor TEXT NOT NULL,
            payload JSONB,
            timestamp TIMESTAMPTZ DEFAULT now()
        );
    """)
    print("Tables created.")
    
    # Insert default agent policy for demo purposes
    await conn.execute("""
        INSERT INTO agent_policies (user_id, auto_approve_limit, hard_limit) 
        VALUES ('demo_user', 2000, 5000);
    """)

    print("\nSeed complete! Agentic Commerce tables added to Neon DB.")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(seed())
