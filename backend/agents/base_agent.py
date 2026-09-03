from abc import ABC, abstractmethod
import os
import asyncpg
from groq import AsyncGroq
from dotenv import load_dotenv

load_dotenv()


class BaseAgent(ABC):
    """Abstract base for all agents. Provides shared DB pool and Groq client."""

    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool
        self.groq = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
        self.model = "openai/gpt-oss-120b"

    async def call_groq(self, system_prompt: str, user_prompt: str, json_mode: bool = True) -> str:
        """Wrapper for Groq chat completions."""
        response = await self.groq.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"} if json_mode else {"type": "text"},
            temperature=0.3,
            max_tokens=1024,
        )
        return response.choices[0].message.content

    @abstractmethod
    async def run(self, **kwargs):
        pass
