import os  # import os for environment variable access
from dotenv import load_dotenv  # import dotenv loader for .env support

load_dotenv()  # load environment variables from a .env file if present


def get_env_variable(name: str, default: str = "") -> str:
    return os.getenv(name, default)  # read an environment variable with an optional default


def format_chat_message(user_message: str) -> str:
    return user_message.strip()  # trim whitespace from the chat message before use
