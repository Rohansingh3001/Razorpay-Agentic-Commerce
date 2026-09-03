import asyncio
import razorpay
import os
from dotenv import load_dotenv
from db.connection import create_pool, close_pool, get_pool

load_dotenv()

async def main():
    await create_pool()
    pool = get_pool()
    client = razorpay.Client(auth=(os.getenv('RAZORPAY_KEY_ID'), os.getenv('RAZORPAY_KEY_SECRET')))
    async with pool.acquire() as conn:
        rows = await conn.fetch('SELECT purchase_request_id, razorpay_order_id, status FROM payment_orders ORDER BY created_at DESC LIMIT 5')
        for r in rows:
            if r['razorpay_order_id']:
                try:
                    link = client.payment_link.fetch(r['razorpay_order_id'])
                    print(f"PR: {r['purchase_request_id']}, DB Status: {r['status']}, RZP Status: {link.get('status')}")
                except Exception as e:
                    print("Error fetching RZP:", e)
    await close_pool()

asyncio.run(main())
