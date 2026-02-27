"""Configuration management for Qwen3-TTS Voice Server."""

import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Server configuration with environment variable support."""

    # Server
    HOST: str = "127.0.0.1"
    PORT: int = 8888  # Standard PAI voice server port

    # Model - CustomVoice for locked speaker identity + emotional control
    MODEL_SIZE: str = "1.7B"  # "1.7B" for best quality (actually faster than 0.6B)

    # Speed optimization - skip LLM inference, use heuristics only
    USE_LLM_EMOTION: bool = False  # False = fast heuristics, True = LLM inference
    MODEL_NAME: str = "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice"
    MODEL_TYPE: str = "CustomVoice"  # "CustomVoice" (recommended), "VoiceDesign", or "Base"
    DEFAULT_LANGUAGE: str = "en"

    # Locked speaker identity - CustomVoice speakers:
    # English: "Ryan" (dynamic, rhythmic), "Aiden" (sunny, clear)
    # Japanese: "Ono_Anna" (playful, nimble)
    DEFAULT_SPEAKER: str = "Ryan"  # Locked voice identity for Kai

    # Base voice style modifiers (always applied on top of speaker)
    # These shape the permanent character of the voice
    BASE_VOICE_STYLE: str = "slightly higher pitch, curious and eager to help, warm but efficient, speaking at 1.4x speed, rapid energetic delivery"

    # Audio
    AUDIO_FORMAT: str = "wav"
    SAMPLE_RATE: int = 24000
    DEFAULT_VOLUME: float = 0.8
    MAX_TEXT_LENGTH: int = 1000

    # Paths
    BASE_DIR: Path = Path.home() / ".claude" / "VoiceServer"
    VOICE_PROMPTS_DIR: Path = BASE_DIR / "voices"
    REFERENCE_AUDIO_DIR: Path = BASE_DIR / "reference_audio"
    TEMP_AUDIO_DIR: Path = Path("/tmp/pai-voice")
    LOGS_DIR: Path = BASE_DIR / "logs"

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 20

    # Timeouts
    GENERATION_TIMEOUT: int = 60  # seconds

    class Config:
        env_prefix = "QWEN3_"
        extra = "ignore"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Set model name based on type and size
        # CustomVoice = locked speaker + emotional instruct (RECOMMENDED)
        # VoiceDesign = natural language voice descriptions (inconsistent)
        # Base = voice cloning only (no emotion control)
        model_map = {
            "CustomVoice": {
                "1.7B": "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
                "0.6B": "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice",
            },
            "VoiceDesign": {
                "1.7B": "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
                "0.6B": "Qwen/Qwen3-TTS-12Hz-0.6B-Base",  # No 0.6B VoiceDesign
            },
            "Base": {
                "1.7B": "Qwen/Qwen3-TTS-12Hz-1.7B-Base",
                "0.6B": "Qwen/Qwen3-TTS-12Hz-0.6B-Base",
            },
        }
        self.MODEL_NAME = model_map.get(self.MODEL_TYPE, model_map["CustomVoice"]).get(
            self.MODEL_SIZE, model_map["CustomVoice"]["1.7B"]
        )

        # Ensure directories exist
        self.TEMP_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
        self.VOICE_PROMPTS_DIR.mkdir(parents=True, exist_ok=True)
        (self.VOICE_PROMPTS_DIR / "prompts").mkdir(exist_ok=True)


# Global settings instance
settings = Settings()
