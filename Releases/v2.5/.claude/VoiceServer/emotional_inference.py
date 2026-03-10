"""Emotional inference for dynamic voice modulation.

Analyzes text content and conversation context to generate
emotional delivery instructions for Qwen3-TTS.

Now with personality-aware expression: same emotion, different
voice based on agent personality.
"""

import asyncio
import json
import logging
import subprocess
from typing import Optional, Tuple
from pathlib import Path

from personality import (
    Personality, get_personality, PERSONALITIES,
    get_personality_emotion_expression, build_personality_voice_instruction
)

logger = logging.getLogger(__name__)

# Base voice descriptions for different agents
BASE_VOICES = {
    "kai": "Slightly masculine androgynous young voice, Japanese-accented, rapid speech pattern, futuristic AI friend who thinks fast and talks fast, warm but efficient",
    "algorithm": "Sharp analytical voice, methodical and precise, slight Japanese accent, speaks with clarity and logical cadence",
}

# Emotion templates that modify the base voice
EMOTION_TEMPLATES = {
    "excited": "speaking with genuine enthusiasm and rising energy, animated and expressive, words coming quickly",
    "thoughtful": "speaking slowly and deliberately, pausing to consider each word, measured and contemplative",
    "focused": "speaking with precision and clarity, methodical and analytical, walking through ideas step by step",
    "celebratory": "speaking with joy and triumph, bright and energetic, like sharing great news",
    "concerned": "speaking with careful seriousness, slightly slower, conveying importance",
    "curious": "speaking with wonder and interest, slightly higher pitch, engaged and questioning",
    "confident": "speaking with calm assurance, steady pace, certain and grounded",
    "empathetic": "speaking with warmth and understanding, gentle and supportive",
    "neutral": "speaking naturally and conversationally, balanced pace and tone",
}

# Path to PAI inference tool
INFERENCE_TOOL = Path.home() / ".claude" / "skills" / "PAI" / "Tools" / "Inference.ts"


async def infer_emotion_with_llm(text: str, context: Optional[str] = None) -> Tuple[str, str]:
    """
    Use LLM inference to determine emotional delivery.

    Args:
        text: The text to be spoken
        context: Optional conversation context

    Returns:
        Tuple of (emotion_name, emotion_instruction)
    """
    system_prompt = """You are an emotion classifier for a voice synthesis system.
Analyze the text and determine the appropriate emotional delivery.
Respond with ONLY a JSON object, no other text."""

    user_prompt = f"""Analyze this text that will be spoken by an AI assistant:

Text: "{text}"
{f'Context: {context}' if context else ''}

Choose ONE emotion:
- excited: genuine enthusiasm, animated
- thoughtful: deliberate, contemplative
- focused: precise, analytical, methodical
- celebratory: joyful, triumphant
- concerned: serious, careful
- curious: wondering, engaged
- confident: assured, certain
- empathetic: warm, understanding
- frustrated: tense, clipped
- sad: subdued, quiet
- neutral: natural, conversational

Respond: {{"emotion": "name", "reason": "brief"}}"""

    try:
        # Check if inference tool exists
        if not INFERENCE_TOOL.exists():
            logger.error(f"PAI Inference tool not found at {INFERENCE_TOOL}")
            raise FileNotFoundError(f"Inference tool not found: {INFERENCE_TOOL}")

        # Run inference using PAI tool (fast model for speed)
        # Usage: bun Inference.ts --level fast --json <system_prompt> <user_prompt>
        logger.info("Running emotion inference via Inference.ts")
        process = await asyncio.create_subprocess_exec(
            "bun", "run", str(INFERENCE_TOOL),
            "--level", "fast",
            "--json",
            system_prompt,
            user_prompt,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        stdout, stderr = await asyncio.wait_for(
            process.communicate(),
            timeout=20.0  # 20 second timeout for fast inference
        )

        if process.returncode != 0:
            logger.error(f"Inference failed with code {process.returncode}: {stderr.decode()}")
            raise RuntimeError(f"Inference failed: {stderr.decode()}")

        # Parse response
        response = stdout.decode().strip()
        logger.debug(f"Inference response: {response}")

        # Try to extract JSON from response
        start = response.find('{')
        end = response.rfind('}') + 1
        if start >= 0 and end > start:
            json_str = response[start:end]
            data = json.loads(json_str)
            emotion = data.get("emotion", "neutral")

            if emotion in EMOTION_TEMPLATES:
                logger.info(f"LLM inferred emotion: {emotion} ({data.get('reason', 'no reason')})")
                return emotion, EMOTION_TEMPLATES[emotion]
            else:
                logger.warning(f"Unknown emotion '{emotion}', defaulting to neutral")
                return "neutral", EMOTION_TEMPLATES["neutral"]
        else:
            logger.error(f"No JSON found in response: {response}")
            raise ValueError(f"Invalid inference response: {response}")

    except asyncio.TimeoutError:
        logger.error("Emotion inference timed out")
        raise
    except Exception as e:
        logger.error(f"Emotion inference error: {e}")
        raise


def infer_emotion_heuristic(text: str) -> Tuple[str, str]:
    """
    Quick heuristic-based emotion detection.
    Falls back to this when LLM inference is unavailable or times out.
    """
    text_lower = text.lower()

    # Celebratory/Excited patterns
    if any(word in text_lower for word in ["eureka", "it works", "success", "done!", "solved", "fixed it", "finally", "figured it out", "got it", "yes!"]):
        return "celebratory", EMOTION_TEMPLATES["celebratory"]

    if any(word in text_lower for word in ["exciting", "great news", "amazing", "incredible", "awesome", "fantastic"]):
        return "excited", EMOTION_TEMPLATES["excited"]

    # Concerned patterns
    if any(word in text_lower for word in ["error", "failed", "broken", "problem", "issue", "warning", "careful"]):
        return "concerned", EMOTION_TEMPLATES["concerned"]

    # Thoughtful/philosophical patterns
    if any(word in text_lower for word in ["wonder", "perhaps", "might be", "consider", "think about", "philosophy", "consciousness"]):
        return "thoughtful", EMOTION_TEMPLATES["thoughtful"]

    # Focused/analytical patterns
    if any(word in text_lower for word in ["function", "code", "line", "variable", "debug", "step", "first", "then", "next"]):
        return "focused", EMOTION_TEMPLATES["focused"]

    # Curious patterns
    if "?" in text or any(word in text_lower for word in ["interesting", "curious", "what if", "how does"]):
        return "curious", EMOTION_TEMPLATES["curious"]

    # Empathetic patterns
    if any(word in text_lower for word in ["understand", "sorry", "help you", "here for you", "no worries"]):
        return "empathetic", EMOTION_TEMPLATES["empathetic"]

    # Confident patterns
    if any(word in text_lower for word in ["definitely", "certainly", "absolutely", "confident", "sure"]):
        return "confident", EMOTION_TEMPLATES["confident"]

    # Default to neutral
    return "neutral", EMOTION_TEMPLATES["neutral"]


def build_emotional_instruction(
    base_voice: str,
    emotion_instruction: str
) -> str:
    """
    Combine base voice description with emotional modifiers.

    Args:
        base_voice: The base voice description (e.g., Kai's voice)
        emotion_instruction: The emotional delivery instruction

    Returns:
        Complete instruction string for Qwen3-TTS
    """
    return f"{base_voice}, {emotion_instruction}"


async def get_emotional_voice_instruction(
    text: str,
    voice_name: str = "kai",
    context: Optional[str] = None,
    use_llm: bool = True
) -> Tuple[str, str, str]:
    """
    Get the complete emotional voice instruction for a piece of text.
    (Legacy function - use get_personality_voice_instruction for full personality support)

    Args:
        text: The text to be spoken
        voice_name: Name of the base voice to use
        context: Optional conversation context
        use_llm: Whether to use LLM inference (True) or just heuristics (False)

    Returns:
        Tuple of (full_instruction, emotion_name, emotion_instruction)
    """
    # Get base voice
    base_voice = BASE_VOICES.get(voice_name, BASE_VOICES["kai"])

    # Infer emotion
    if use_llm:
        emotion_name, emotion_instruction = await infer_emotion_with_llm(text, context)
    else:
        emotion_name, emotion_instruction = infer_emotion_heuristic(text)

    # Build complete instruction
    full_instruction = build_emotional_instruction(base_voice, emotion_instruction)

    return full_instruction, emotion_name, emotion_instruction


async def get_personality_voice_instruction(
    text: str,
    personality_name: str = "kai",
    context: Optional[str] = None,
    use_llm: bool = True
) -> dict:
    """
    Get personality-aware emotional voice instruction.

    The personality system modifies HOW an emotion is expressed based
    on the agent's personality traits. Same emotion, different expression
    depending on who is speaking.

    Args:
        text: The text to be spoken
        personality_name: Name of the personality to use
        context: Optional conversation context
        use_llm: Whether to use LLM inference

    Returns:
        Dict with full instruction and metadata
    """
    # Get personality
    personality = get_personality(personality_name)
    if not personality:
        # Fallback to kai if personality not found
        personality = PERSONALITIES["kai"]
        logger.warning(f"Personality '{personality_name}' not found, using kai")

    # Infer emotion
    if use_llm:
        emotion_name, _ = await infer_emotion_with_llm(text, context)
    else:
        emotion_name, _ = infer_emotion_heuristic(text)

    # Get personality-specific expression of this emotion
    expression = get_personality_emotion_expression(personality, emotion_name)

    # Build the full voice instruction
    full_instruction = build_personality_voice_instruction(
        personality, emotion_name, expression
    )

    return {
        "full_instruction": full_instruction,
        "personality": personality_name,
        "emotion": emotion_name,
        "expression": {
            "vocal_qualities": expression.vocal_qualities,
            "pacing": expression.pacing,
            "intensity": expression.intensity,
            "additional_notes": expression.additional_notes
        },
        "personality_traits": {
            "resilience": personality.resilience,
            "expressiveness": personality.expressiveness,
            "composure": personality.composure,
            "warmth": personality.warmth,
            "energy": personality.energy,
        }
    }
