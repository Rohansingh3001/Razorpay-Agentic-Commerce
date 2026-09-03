import asyncio
import json
from backend.main import chat_with_agent, ChatRequest, lifespan, app

async def main():
    async with lifespan(app):
        req = ChatRequest(
            session_id="test1234",
            messages=[
                {"role": "user", "content": "Search for wireless headphones"}
            ]
        )
        res = await chat_with_agent(req)
        print("TURN 1:", json.dumps(res, indent=2))
        
        req.messages.append({"role": "assistant", "content": res["reply"]})
        req.messages.append({"role": "user", "content": "Add 2 to my cart"})
        res = await chat_with_agent(req)
        print("TURN 2:", json.dumps(res, indent=2))

        req.messages.append({"role": "assistant", "content": res["reply"]})
        req.messages.append({"role": "user", "content": "Proceed and checkout"})
        res = await chat_with_agent(req)
        print("TURN 3:", json.dumps(res, indent=2))
        
        req.messages.append({"role": "assistant", "content": res["reply"]})
        req.messages.append({"role": "user", "content": "Confirmed shipping address:\nName: John Doe\nAddress: 123 Test St\nPhone: 1234567890"})
        res = await chat_with_agent(req)
        print("TURN 4:", json.dumps(res, indent=2))

asyncio.run(main())
