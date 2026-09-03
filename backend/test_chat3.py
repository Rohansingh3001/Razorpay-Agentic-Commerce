import asyncio
import json
import sys
from main import chat_with_agent, ChatRequest, lifespan, app
from db.connection import get_pool

async def main():
    try:
        async with lifespan(app):
            pool = get_pool()
            # Clear old carts
            async with pool.acquire() as conn:
                await conn.execute("DELETE FROM purchase_requests WHERE user_id='demo_user_test1234'")
                await conn.execute("DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id='demo_user_test1234')")
                await conn.execute("DELETE FROM carts WHERE user_id='demo_user_test1234'")

            req = ChatRequest(
                session_id="test1234",
                messages=[
                    {"role": "system", "content": "You are a trusted AI Buyer..."}
                ]
            )
            
            print("--- TURN 1 ---")
            req.messages.append({"role": "user", "content": "Search for wireless headphones"})
            res = await chat_with_agent(req)
            print(json.dumps(res, indent=2))
            
            print("--- TURN 2 ---")
            # Filter out custom tool_calls field just in case
            safe_messages = [{"role": m["role"], "content": m["content"]} for m in req.messages]
            safe_messages.append({"role": "assistant", "content": res["reply"]})
            safe_messages.append({"role": "user", "content": "Add it to my cart"})
            req.messages = safe_messages
            res = await chat_with_agent(req)
            print(json.dumps(res, indent=2))

            print("--- TURN 3 ---")
            safe_messages = [{"role": m["role"], "content": m["content"]} for m in req.messages]
            safe_messages.append({"role": "assistant", "content": res["reply"]})
            safe_messages.append({"role": "user", "content": "Proceed and checkout"})
            req.messages = safe_messages
            res = await chat_with_agent(req)
            print(json.dumps(res, indent=2))
            
            print("--- TURN 4 ---")
            safe_messages = [{"role": m["role"], "content": m["content"]} for m in req.messages]
            safe_messages.append({"role": "assistant", "content": res["reply"]})
            safe_messages.append({"role": "user", "content": "Confirmed shipping address:\nName: John Doe\nAddress: 123 Test St\nPhone: 1234567890"})
            req.messages = safe_messages
            res = await chat_with_agent(req)
            print(json.dumps(res, indent=2))
    except Exception as e:
        print("ERROR:", e)

asyncio.run(main())
