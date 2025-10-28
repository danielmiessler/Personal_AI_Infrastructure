#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# dependencies = [
#     "anthropic",
#     "python-dotenv",
# ]
# ///

import os
import sys
from dotenv import load_dotenv


def prompt_llm(prompt_text):
    """
    Base Anthropic LLM prompting method using fastest model.

    Args:
        prompt_text (str): The prompt to send to the model

    Returns:
        str: The model's response text, or None if error
    """
    load_dotenv()

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return None

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)

        message = client.messages.create(
            model="claude-haiku-4-5-20251001",  # Haiku 4.5 - Fastest, most efficient model (TOP PRIORITY)
            max_tokens=100,
            temperature=0.3,
            messages=[{"role": "user", "content": prompt_text}],
        )

        return message.content[0].text.strip()

    except Exception:
        return None


def generate_completion_message():
    """
    Generate a completion message using Anthropic LLM.

    Returns:
        str: A natural language completion message, or None if error
    """
    engineer_name = os.getenv("ENGINEER_NAME", "").strip()

    if engineer_name:
        name_instruction = f"Sometimes (about 30% of the time) include the engineer's name '{engineer_name}' in a natural way."
        examples = f"""Examples of the style:
- Standard: "Work complete!", "All done!", "Task finished!", "Ready for your next move!"
- Personalized: "{engineer_name}, all set!", "Ready for you, {engineer_name}!", "Complete, {engineer_name}!", "{engineer_name}, we're done!" """
    else:
        name_instruction = ""
        examples = """Examples of the style: "Work complete!", "All done!", "Task finished!", "Ready for your next move!" """

    prompt = f"""Generate a short, concise, friendly completion message for when an AI coding assistant finishes a task.

Requirements:
- Keep it under 10 words
- Make it positive and future focused
- Use natural, conversational language
- Focus on completion/readiness
- Do NOT include quotes, formatting, or explanations
- Return ONLY the completion message text
{name_instruction}

{examples}

Generate ONE completion message:"""

    response = prompt_llm(prompt)

    # Clean up response - remove quotes and extra formatting
    if response:
        response = response.strip().strip('"').strip("'").strip()
        # Take first line if multiple lines
        response = response.split("\n")[0].strip()

    return response


def generate_agent_name():
    """
    Generate a single-word agent name using Anthropic LLM.

    Returns:
        str: A single alphanumeric agent name, or None if error
    """
    prompt = """Generate a single creative agent name for an AI coding assistant.

Requirements:
- MUST be a single word (no spaces)
- MUST be alphanumeric only (letters and numbers, no special characters)
- Make it memorable and related to coding/tech/AI
- Keep it between 4-12 characters
- Examples: CodeNinja, ByteBot, PixelPro, NexusAI, SwiftDev
- Do NOT include quotes, formatting, or explanations
- Return ONLY the agent name

Generate ONE agent name:"""

    response = prompt_llm(prompt)

    # Clean up response - remove quotes and extra formatting
    if response:
        response = response.strip().strip('"').strip("'").strip()
        # Take first word if multiple words
        response = response.split()[0] if response else None
        # Validate it's alphanumeric
        if response and response.isalnum():
            return response

    return None


def main():
    """Command line interface for testing."""
    if len(sys.argv) > 1:
        if sys.argv[1] == "--completion":
            message = generate_completion_message()
            if message:
                print(message)
            else:
                print("Error generating completion message")
        elif sys.argv[1] == "--agent-name":
            agent_name = generate_agent_name()
            if agent_name:
                print(agent_name)
            else:
                print("Error generating agent name")
        else:
            prompt_text = " ".join(sys.argv[1:])
            response = prompt_llm(prompt_text)
            if response:
                print(response)
            else:
                print("Error calling Anthropic API")
    else:
        print(
            "Usage: ./anth.py 'your prompt here' or ./anth.py --completion or ./anth.py --agent-name"
        )


if __name__ == "__main__":
    main()
