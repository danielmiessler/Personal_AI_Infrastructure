"""Pydantic models for API requests and responses."""

from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


# ============================================================================
# Voice Design Models
# ============================================================================

class VoiceTestRequest(BaseModel):
    """Quick voice test - describe and hear immediately."""
    description: str = Field(..., description="Natural language description of desired voice")
    text: str = Field(..., description="Text to speak")
    language: str = Field(default="en", description="Language code")


class VoiceDesignRequest(BaseModel):
    """Design a voice and optionally save it."""
    description: str = Field(..., description="Natural language description of desired voice")
    sample_text: str = Field(default="Hello, this is a voice test.", description="Sample text to generate")
    language: str = Field(default="en", description="Language code")
    name: Optional[str] = Field(None, description="Name to save the voice as")
    save: bool = Field(default=False, description="Whether to save this voice design")


class VoiceCloneRequest(BaseModel):
    """Clone a voice from reference audio."""
    name: str = Field(..., description="Name to save the cloned voice as")
    ref_audio_path: str = Field(..., description="Path to reference audio file")
    ref_text: str = Field(..., description="Transcript of the reference audio")
    sample_text: str = Field(default="Hello, this is my cloned voice.", description="Text to generate with cloned voice")
    language: str = Field(default="en", description="Language code")
    save: bool = Field(default=True, description="Whether to save this voice")


# ============================================================================
# Notification Models (Compatible with existing VoiceServer)
# ============================================================================

class NotifyRequest(BaseModel):
    """Notification request - compatible with existing VoiceServer API."""
    message: str = Field(..., description="Message to speak")
    title: Optional[str] = Field(None, description="Notification title")
    voice_name: Optional[str] = Field(None, description="Name of saved voice to use")
    voice_enabled: bool = Field(default=True, description="Whether to play audio")
    volume: float = Field(default=0.8, ge=0.0, le=1.0, description="Playback volume")


class PAINotifyRequest(BaseModel):
    """PAI-specific notification request."""
    message: str = Field(..., description="Message to speak")
    agent: Optional[str] = Field(None, description="Agent name for voice selection")


# ============================================================================
# Voice Prompt Storage Models
# ============================================================================

class VoicePrompt(BaseModel):
    """A saved voice design or clone."""
    name: str
    description: str
    instruct: str  # The actual instruction for Qwen3-TTS
    language: str = "en"
    type: Literal["designed", "cloned"] = "designed"
    created_at: datetime = Field(default_factory=datetime.now)

    # Clone-specific fields
    ref_audio_path: Optional[str] = None
    ref_text: Optional[str] = None


class VoicePromptIndex(BaseModel):
    """Index of all saved voice prompts."""
    prompts: dict[str, VoicePrompt] = {}


# ============================================================================
# Response Models
# ============================================================================

class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "healthy"
    engine: str = "qwen3-tts"
    model: str
    model_loaded: bool
    port: int


class VoiceTestResponse(BaseModel):
    """Response from voice test."""
    status: str
    duration_ms: Optional[int] = None
    error: Optional[str] = None


class VoiceDesignResponse(BaseModel):
    """Response from voice design."""
    status: str
    voice_prompt: Optional[VoicePrompt] = None
    saved: bool = False
    audio_path: Optional[str] = None
    error: Optional[str] = None


class NotifyResponse(BaseModel):
    """Response from notification."""
    status: str
    message: str
    engine: str = "qwen3-tts"
    error: Optional[str] = None


class VoiceListResponse(BaseModel):
    """List of saved voices."""
    voices: List[VoicePrompt]


# ============================================================================
# Personality Models (sent from agents to voice server)
# ============================================================================

class PersonalityConfig(BaseModel):
    """Personality configuration sent by agents.

    Each trait is 0-100 scale affecting how emotions are expressed vocally.
    """
    # Agent identity
    name: str = Field(..., description="Agent name")
    base_voice: str = Field(..., description="Base voice description without emotion")

    # Energy traits
    enthusiasm: int = Field(default=50, ge=0, le=100, description="How animated/excited they get")
    energy: int = Field(default=50, ge=0, le=100, description="Overall energy level, affects speech pace")
    expressiveness: int = Field(default=50, ge=0, le=100, description="How much emotion shows in voice")

    # Resilience traits
    resilience: int = Field(default=50, ge=0, le=100, description="How they handle setbacks (high=stays steady)")
    composure: int = Field(default=50, ge=0, le=100, description="Staying calm under pressure")
    optimism: int = Field(default=50, ge=0, le=100, description="Positive vs negative framing")

    # Social traits
    warmth: int = Field(default=50, ge=0, le=100, description="Friendliness in tone")
    formality: int = Field(default=50, ge=0, le=100, description="Casual vs formal speech")
    directness: int = Field(default=50, ge=0, le=100, description="Blunt vs diplomatic")

    # Cognitive traits
    precision: int = Field(default=50, ge=0, le=100, description="Careful, exact language")
    curiosity: int = Field(default=50, ge=0, le=100, description="Interest, wonder")
    playfulness: int = Field(default=50, ge=0, le=100, description="Humor, wit, levity")


# ============================================================================
# Emotional Inference Models
# ============================================================================

class EmotionalNotifyRequest(BaseModel):
    """Notification with automatic emotional inference."""
    message: str = Field(..., description="Message to speak")
    context: Optional[str] = Field(None, description="Conversation context for emotional inference")
    voice_name: str = Field(default="kai", description="Base voice to use (legacy)")
    voice_enabled: bool = Field(default=True, description="Whether to play audio")
    volume: float = Field(default=0.8, ge=0.0, le=1.0, description="Playback volume")


class PersonalityNotifyRequest(BaseModel):
    """Notification with full personality-based emotional expression.

    The agent sends its personality config, and the voice server
    uses it to determine how to express the detected emotion.
    """
    message: str = Field(..., description="Message to speak")
    personality: PersonalityConfig = Field(..., description="Agent's personality configuration")
    context: Optional[str] = Field(None, description="Conversation context for emotional inference")
    voice_enabled: bool = Field(default=True, description="Whether to play audio")
    volume: float = Field(default=0.8, ge=0.0, le=1.0, description="Playback volume")


class PersonalityNotifyResponse(BaseModel):
    """Response from personality-based notification."""
    status: str
    message: str
    emotion_detected: Optional[str] = None
    expression: Optional[dict] = None  # How personality shaped the expression
    full_instruction: Optional[str] = None
    engine: str = "qwen3-tts"
    error: Optional[str] = None


class EmotionalNotifyResponse(BaseModel):
    """Response from emotional notification."""
    status: str
    message: str
    emotion_detected: Optional[str] = None
    emotion_instruction: Optional[str] = None
    engine: str = "qwen3-tts"
    error: Optional[str] = None
