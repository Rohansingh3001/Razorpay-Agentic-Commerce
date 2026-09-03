"""
Customer Strategy Agent
-----------------------
A single Groq agent that uses tool-calling to autonomously:
1. Fetch customer profile + predictions from Neon
2. Check discount response and preferred channel
3. Determine optimal send time
4. Generate and store a campaign plan

The Groq model drives the workflow — it decides which tools
to call and in what order, based on what it learns at each step.
"""
import json
import os
from groq import AsyncGroq
from dotenv import load_dotenv
from agents.tools import TOOLS, execute_tool

load_dotenv()

SYSTEM_PROMPT = """You are a Customer Growth AI Agent for an e-commerce merchant.

Your goal: analyse a customer and produce the optimal growth action for them.

You have access to tools that query live customer data. Use them to:
1. Get the customer's full profile (RFM scores, ML predictions)
2. Check their purchase history and top category
3. Determine their discount response rate
4. Find their preferred communication channel
5. Find the best time to reach them
6. Finally, call generate_campaign() with your complete decision

Rules:
- Do NOT invent or assume any numbers. Only use data returned by tools.
- Base your segment classification on the ML scores provided:
    * churn_probability > 0.6 AND value_tier = 'high' → high_value_at_risk
    * purchase_intent > 0.7 AND recency_days > purchase_interval → ready_to_buy
    * recency_days > 2 × purchase_interval → lapsed_customer  
    * frequency > 10 AND discount_response_rate > 0.6 → loyal_deal_seeker
    * default → general_nurture
- Always call generate_campaign() as your final step.
- Be concise. The message must be under 160 characters.
"""


class CustomerStrategyAgent:

    def __init__(self, pool):
        self.pool = pool
        self.groq = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
        self.model = "openai/gpt-oss-120b"

    async def run(self, customer_id: str) -> dict:
        """
        Run the agentic tool-calling loop for a single customer.
        Returns the final campaign plan + full tool-call trace.
        """
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Analyse customer {customer_id} and create the best growth action for them."}
        ]

        campaign_store: list = []
        tool_trace: list = []
        max_turns = 10  # safety limit

        for turn in range(max_turns):
            response = await self.groq.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
                temperature=0.2,
                max_tokens=1024,
            )

            msg = response.choices[0].message

            # No more tool calls → agent is done
            if not msg.tool_calls:
                break

            # Append the assistant message (with tool_calls)
            messages.append({"role": "assistant", "content": msg.content, "tool_calls": [
                {"id": tc.id, "type": "function",
                 "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                for tc in msg.tool_calls
            ]})

            # Execute each tool call and append results
            for tc in msg.tool_calls:
                args = json.loads(tc.function.arguments)
                result = await execute_tool(tc.function.name, args, self.pool, campaign_store)

                tool_trace.append({
                    "turn": turn + 1,
                    "tool": tc.function.name,
                    "arguments": args,
                    "result": json.loads(result),
                })

                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result,
                })

            # Stop if campaign has been generated
            if campaign_store:
                break

        return {
            "campaign": campaign_store[0] if campaign_store else None,
            "tool_trace": tool_trace,
            "turns": len(tool_trace),
        }
