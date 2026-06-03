from typing import Optional

from groq import Groq  # import the Groq client for API calls

from .utils import get_env_variable, format_chat_message  # import environment and formatting helpers


class Chatbot:
    def __init__(self, bot_name: str = "AI Chatbot"):
        self.bot_name = bot_name  # store the bot's display name on the instance
        self.api_key = get_env_variable("GROQ_API_KEY").strip()  # read the Groq API key from the environment
        if not self.api_key:
            raise RuntimeError("GROQ_API_KEY is not configured in environment or .env")  # require the API key to use Groq

        self.client = Groq(api_key=self.api_key)  # create Groq client with API key
        self.model = get_env_variable("GROQ_MODEL", "llama-3.1-8b-instant").strip()  # allow model override via environment
        self.use_stream = get_env_variable("GROQ_STREAM", "false").strip().lower() in ("true", "1", "yes")
        self.compound_tools = self._parse_tools(get_env_variable("GROQ_COMPOUND_TOOLS", ""))

    def get_response(self, message: str) -> str:
        cleaned = message.strip()  # remove extra whitespace from the incoming message
        if not cleaned:  # if the cleaned message is empty
            return "Please send a message to start the conversation."  # return a prompt telling the user to send text

        try:
            return self._generate_reply(cleaned)  # generate and return the chatbot's reply
        except Exception as exc:
            return f"Error generating response: {exc}"  # return a readable error if the API call fails

    def _parse_tools(self, tools_string: str) -> list[str]:
        return [tool.strip() for tool in tools_string.split(",") if tool.strip()]

    def _is_compound_model(self) -> bool:
        return "compound" in self.model or self.model.startswith("groq/")

    def _stream_response(self, stream) -> str:
        chunks: list[str] = []
        for chunk in stream:
            delta = getattr(getattr(chunk.choices[0], "delta", None), "content", None)
            if delta:
                chunks.append(delta)
        content = "".join(chunks).strip()
        if not content:
            raise RuntimeError("Groq returned no streamed content")
        return content

    def _generate_reply(self, message: str) -> str:
        prompt = format_chat_message(message)  # clean the message before sending to Groq
        request_payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": f"You are a helpful assistant named {self.bot_name}."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.7,
            "max_completion_tokens": 350,
            "stream": self.use_stream,
        }

        if self.compound_tools and self._is_compound_model():
            request_payload["compound_custom"] = {"tools": {"enabled_tools": self.compound_tools}}

        response = self.client.chat.completions.create(**request_payload)

        if self.use_stream:
            return self._stream_response(response)

        if not response.choices:
            raise RuntimeError("Groq returned no choices")  # guard against empty responses

        content = response.choices[0].message.content.strip()
        return content  # return the AI-generated content
