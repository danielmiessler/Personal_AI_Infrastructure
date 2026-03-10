"""Qwen3-TTS Voice Server - FastAPI Application."""

import asyncio
import logging
import time
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Optional
from collections import defaultdict

from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from models import (
    VoiceTestRequest, VoiceTestResponse,
    VoiceDesignRequest, VoiceDesignResponse,
    VoiceCloneRequest,
    NotifyRequest, NotifyResponse,
    PAINotifyRequest,
    HealthResponse,
    VoiceListResponse,
    VoicePrompt,
    EmotionalNotifyRequest, EmotionalNotifyResponse,
    PersonalityNotifyRequest, PersonalityNotifyResponse,
    PersonalityConfig
)
from emotional_inference import get_emotional_voice_instruction, infer_emotion_heuristic, infer_emotion_with_llm
from personality import Personality, get_personality_emotion_expression, build_personality_voice_instruction
from tts_engine import Qwen3TTSEngine
from audio_player import play_audio

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(settings.LOGS_DIR / "qwen3-voice-server.log")
    ]
)
logger = logging.getLogger(__name__)

# Global TTS engine (lazy loaded)
tts_engine: Optional[Qwen3TTSEngine] = None

# Rate limiting
request_counts: dict[str, dict] = defaultdict(lambda: {"count": 0, "reset_time": 0})


def check_rate_limit(ip: str) -> bool:
    """Check if request is within rate limit."""
    now = time.time()
    record = request_counts[ip]

    if now > record["reset_time"]:
        record["count"] = 0
        record["reset_time"] = now + 60  # 1 minute window

    record["count"] += 1
    return record["count"] <= settings.RATE_LIMIT_PER_MINUTE


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    global tts_engine

    logger.info("=" * 60)
    logger.info("Qwen3-TTS Voice Server Starting")
    logger.info(f"  Port: {settings.PORT}")
    logger.info(f"  Model: {settings.MODEL_NAME}")
    logger.info(f"  Lazy loading: enabled")
    logger.info("=" * 60)

    # Initialize engine with lazy loading
    # Using CustomVoice for locked speaker identity + emotional control
    tts_engine = Qwen3TTSEngine(
        model_size=settings.MODEL_SIZE,
        model_type=settings.MODEL_TYPE,
        lazy_load=True
    )

    # Ensure temp directory exists
    settings.TEMP_AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    yield

    # Cleanup
    logger.info("Shutting down Qwen3-TTS Voice Server")


# Create FastAPI app
app = FastAPI(
    title="Qwen3-TTS Voice Server",
    description="Local AI voice generation with voice design and cloning",
    version="1.0.0",
    lifespan=lifespan
)

# CORS - localhost only
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost", "http://127.0.0.1"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# ============================================================================
# Middleware
# ============================================================================

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Apply rate limiting."""
    client_ip = request.client.host if request.client else "unknown"

    if not check_rate_limit(client_ip):
        return JSONResponse(
            status_code=429,
            content={"error": "Rate limit exceeded. Try again later."}
        )

    return await call_next(request)


# ============================================================================
# Health Endpoint
# ============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        engine="qwen3-tts",
        model=settings.MODEL_NAME,
        model_loaded=tts_engine.is_loaded if tts_engine else False,
        port=settings.PORT
    )


# ============================================================================
# Voice Design Endpoints
# ============================================================================

@app.post("/voice/test", response_model=VoiceTestResponse)
async def voice_test(request: VoiceTestRequest):
    """
    Quick voice test - describe a voice and hear it immediately.

    Example:
        curl -X POST http://localhost:8889/voice/test \
          -H "Content-Type: application/json" \
          -d '{"description": "excited scientist", "text": "Eureka! It works!"}'
    """
    if not tts_engine:
        raise HTTPException(status_code=503, detail="TTS engine not initialized")

    start_time = time.time()

    try:
        # Generate audio
        audio, sr = await tts_engine.generate_voice_design(
            text=request.text[:settings.MAX_TEXT_LENGTH],
            description=request.description,
            language=request.language
        )

        # Save to temp file
        audio_path = tts_engine.save_audio(audio, sr)

        # Play immediately
        await play_audio(audio_path, volume=settings.DEFAULT_VOLUME, delete_after=True)

        duration_ms = int((time.time() - start_time) * 1000)

        return VoiceTestResponse(
            status="success",
            duration_ms=duration_ms
        )

    except Exception as e:
        logger.error(f"Voice test failed: {e}")
        return VoiceTestResponse(
            status="error",
            error=str(e)
        )


@app.post("/voice/design", response_model=VoiceDesignResponse)
async def voice_design(request: VoiceDesignRequest):
    """
    Design a new voice from natural language description.

    Example:
        curl -X POST http://localhost:8889/voice/design \
          -H "Content-Type: application/json" \
          -d '{
            "description": "A warm British butler voice",
            "sample_text": "Very good, sir.",
            "name": "jeeves",
            "save": true
          }'
    """
    if not tts_engine:
        raise HTTPException(status_code=503, detail="TTS engine not initialized")

    try:
        # Generate audio
        audio, sr = await tts_engine.generate_voice_design(
            text=request.sample_text[:settings.MAX_TEXT_LENGTH],
            description=request.description,
            language=request.language
        )

        # Save audio to file
        audio_path = tts_engine.save_audio(audio, sr)

        # Create voice prompt
        voice_prompt = VoicePrompt(
            name=request.name or f"voice-{int(time.time())}",
            description=request.description[:100],
            instruct=request.description,
            language=request.language,
            type="designed",
            created_at=datetime.now()
        )

        # Save if requested
        saved = False
        if request.save and request.name:
            tts_engine.save_voice_prompt(voice_prompt)
            saved = True

        # Play the audio
        await play_audio(audio_path, volume=settings.DEFAULT_VOLUME, delete_after=not saved)

        return VoiceDesignResponse(
            status="success",
            voice_prompt=voice_prompt,
            saved=saved,
            audio_path=str(audio_path) if saved else None
        )

    except Exception as e:
        logger.error(f"Voice design failed: {e}")
        return VoiceDesignResponse(
            status="error",
            error=str(e)
        )


@app.post("/voice/clone", response_model=VoiceDesignResponse)
async def voice_clone(request: VoiceCloneRequest):
    """
    Clone a voice from reference audio.

    Example:
        curl -X POST http://localhost:8889/voice/clone \
          -H "Content-Type: application/json" \
          -d '{
            "name": "myvoice",
            "ref_audio_path": "/path/to/reference.wav",
            "ref_text": "The text spoken in the reference audio.",
            "sample_text": "Hello, this is my cloned voice."
          }'
    """
    if not tts_engine:
        raise HTTPException(status_code=503, detail="TTS engine not initialized")

    # Verify reference audio exists
    ref_path = Path(request.ref_audio_path)
    if not ref_path.exists():
        raise HTTPException(status_code=400, detail=f"Reference audio not found: {request.ref_audio_path}")

    try:
        # Generate audio
        audio, sr = await tts_engine.generate_voice_clone(
            text=request.sample_text[:settings.MAX_TEXT_LENGTH],
            ref_audio_path=request.ref_audio_path,
            ref_text=request.ref_text,
            language=request.language
        )

        # Save audio
        audio_path = tts_engine.save_audio(audio, sr)

        # Create voice prompt
        voice_prompt = VoicePrompt(
            name=request.name,
            description=f"Cloned from {ref_path.name}",
            instruct="",  # Not used for clones
            language=request.language,
            type="cloned",
            ref_audio_path=request.ref_audio_path,
            ref_text=request.ref_text,
            created_at=datetime.now()
        )

        # Save if requested
        saved = False
        if request.save:
            tts_engine.save_voice_prompt(voice_prompt)
            saved = True

        # Play the audio
        await play_audio(audio_path, volume=settings.DEFAULT_VOLUME, delete_after=True)

        return VoiceDesignResponse(
            status="success",
            voice_prompt=voice_prompt,
            saved=saved
        )

    except Exception as e:
        logger.error(f"Voice clone failed: {e}")
        return VoiceDesignResponse(
            status="error",
            error=str(e)
        )


# ============================================================================
# Voice Library Endpoints
# ============================================================================

@app.get("/voices", response_model=VoiceListResponse)
async def list_voices():
    """List all saved voice designs."""
    if not tts_engine:
        raise HTTPException(status_code=503, detail="TTS engine not initialized")

    return VoiceListResponse(voices=tts_engine.list_voice_prompts())


@app.get("/voices/{name}", response_model=VoicePrompt)
async def get_voice(name: str):
    """Get a specific voice prompt."""
    if not tts_engine:
        raise HTTPException(status_code=503, detail="TTS engine not initialized")

    prompt = tts_engine.get_voice_prompt(name)
    if not prompt:
        raise HTTPException(status_code=404, detail=f"Voice not found: {name}")

    return prompt


@app.delete("/voices/{name}")
async def delete_voice(name: str):
    """Delete a saved voice."""
    if not tts_engine:
        raise HTTPException(status_code=503, detail="TTS engine not initialized")

    if not tts_engine.delete_voice_prompt(name):
        raise HTTPException(status_code=404, detail=f"Voice not found: {name}")

    return {"status": "success", "message": f"Deleted voice: {name}"}


@app.post("/voices/{name}/preview")
async def preview_voice(name: str, text: str = "Hello, this is a voice preview."):
    """Preview a saved voice with sample text."""
    if not tts_engine:
        raise HTTPException(status_code=503, detail="TTS engine not initialized")

    prompt = tts_engine.get_voice_prompt(name)
    if not prompt:
        raise HTTPException(status_code=404, detail=f"Voice not found: {name}")

    try:
        audio, sr = await tts_engine.generate_with_prompt(
            text=text[:settings.MAX_TEXT_LENGTH],
            voice_name=name
        )

        audio_path = tts_engine.save_audio(audio, sr)
        await play_audio(audio_path, volume=settings.DEFAULT_VOLUME, delete_after=True)

        return {"status": "success", "voice": name, "text": text}

    except Exception as e:
        logger.error(f"Voice preview failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Notification Endpoints (Compatible with existing VoiceServer)
# ============================================================================

@app.post("/notify", response_model=NotifyResponse)
async def notify(request: NotifyRequest):
    """
    Send a voice notification with LOCKED speaker identity.

    Uses CustomVoice for consistent voice output.

    Example:
        curl -X POST http://localhost:8889/notify \
          -H "Content-Type: application/json" \
          -d '{"message": "Task complete", "voice_name": "kai"}'
    """
    if not tts_engine:
        raise HTTPException(status_code=503, detail="TTS engine not initialized")

    if not request.voice_enabled:
        return NotifyResponse(
            status="success",
            message="Notification received (voice disabled)",
            engine="qwen3-tts"
        )

    try:
        text = request.message[:settings.MAX_TEXT_LENGTH]

        # Use CustomVoice with locked speaker - no emotional instruction for basic notify
        audio, sr = await tts_engine.generate_custom_voice(
            text=text,
            speaker=settings.DEFAULT_SPEAKER,  # Locked identity (Ryan)
            instruct=None,  # No emotional instruction for basic notify
            language=settings.DEFAULT_LANGUAGE
        )

        # Save and play
        audio_path = tts_engine.save_audio(audio, sr)
        await play_audio(audio_path, volume=request.volume, delete_after=True)

        return NotifyResponse(
            status="success",
            message="Notification sent",
            engine="qwen3-tts"
        )

    except Exception as e:
        logger.error(f"Notification failed: {e}")
        return NotifyResponse(
            status="error",
            message="Notification failed",
            engine="qwen3-tts",
            error=str(e)
        )


@app.post("/pai", response_model=NotifyResponse)
async def pai_notify(request: PAINotifyRequest):
    """PAI-specific notification endpoint."""
    # Convert to standard notify request
    notify_request = NotifyRequest(
        message=request.message,
        voice_name=request.agent,  # Agent name maps to voice
        voice_enabled=True
    )
    return await notify(notify_request)


# ============================================================================
# Emotional Inference Endpoints
# ============================================================================

@app.post("/notify/emotional", response_model=EmotionalNotifyResponse)
async def emotional_notify(request: EmotionalNotifyRequest):
    """
    Send a notification with automatic emotional inference.

    Uses CustomVoice with LOCKED speaker identity (Ryan by default) and
    dynamic emotional expression via the instruct parameter.

    Example:
        curl -X POST http://localhost:8889/notify/emotional \
          -H "Content-Type: application/json" \
          -d '{
            "message": "I figured it out! The bug was in the recursive call!",
            "voice_name": "kai"
          }'
    """
    if not tts_engine:
        raise HTTPException(status_code=503, detail="TTS engine not initialized")

    if not request.voice_enabled:
        return EmotionalNotifyResponse(
            status="success",
            message="Notification received (voice disabled)",
            engine="qwen3-tts"
        )

    try:
        text = request.message[:settings.MAX_TEXT_LENGTH]

        # Get emotional instruction (heuristics for speed, LLM if configured)
        _, emotion_name, emotion_instruction = await get_emotional_voice_instruction(
            text=text,
            voice_name=request.voice_name,
            context=request.context,
            use_llm=getattr(settings, 'USE_LLM_EMOTION', False)
        )

        # Combine base voice style with emotion instruction
        base_style = getattr(settings, 'BASE_VOICE_STYLE', '')
        if base_style:
            full_instruct = f"{base_style}, {emotion_instruction}"
        else:
            full_instruct = emotion_instruction

        logger.info(f"Voice instruct: {full_instruct[:80]}...")

        # Generate audio with CustomVoice - LOCKED speaker, styled + emotional
        audio, sr = await tts_engine.generate_custom_voice(
            text=text,
            speaker=settings.DEFAULT_SPEAKER,  # Locked identity (Ryan)
            instruct=full_instruct,            # Base style + dynamic emotion
            language=settings.DEFAULT_LANGUAGE
        )

        # Save and play
        audio_path = tts_engine.save_audio(audio, sr)
        await play_audio(audio_path, volume=request.volume, delete_after=True)

        return EmotionalNotifyResponse(
            status="success",
            message="Notification sent with emotional delivery",
            emotion_detected=emotion_name,
            emotion_instruction=emotion_instruction,
            engine="qwen3-tts"
        )

    except Exception as e:
        logger.error(f"Emotional notification failed: {e}")
        return EmotionalNotifyResponse(
            status="error",
            message="Notification failed",
            engine="qwen3-tts",
            error=str(e)
        )


@app.post("/notify/emotional/preview")
async def preview_emotional_inference(text: str, context: Optional[str] = None, voice_name: str = "kai"):
    """
    Preview what emotional delivery would be inferred for a piece of text.
    Does not generate audio - just returns the inference results.

    Example:
        curl -X POST "http://localhost:8889/notify/emotional/preview?text=Eureka!%20It%20works!"
    """
    full_instruction, emotion_name, emotion_instruction = await get_emotional_voice_instruction(
        text=text,
        voice_name=voice_name,
        context=context,
        use_llm=True
    )

    return {
        "text": text,
        "emotion_detected": emotion_name,
        "emotion_instruction": emotion_instruction,
        "full_voice_instruction": full_instruction
    }


# ============================================================================
# Personality-Based Voice Endpoints
# ============================================================================

@app.post("/notify/personality", response_model=PersonalityNotifyResponse)
async def personality_notify(request: PersonalityNotifyRequest):
    """
    Speak with full personality-based emotional expression.

    Uses CustomVoice with LOCKED speaker identity and personality-shaped
    emotional instructions. Same speaker, different expression per personality.

    Example:
        curl -X POST http://localhost:8889/notify/personality \
          -H "Content-Type: application/json" \
          -d '{
            "message": "I figured it out!",
            "personality": {
              "name": "kai",
              "base_voice": "Androgynous young voice, Japanese-accented, rapid speech",
              "enthusiasm": 60,
              "resilience": 85,
              "expressiveness": 65,
              "composure": 70,
              "warmth": 70,
              "energy": 75,
              "precision": 95
            }
          }'
    """
    if not tts_engine:
        raise HTTPException(status_code=503, detail="TTS engine not initialized")

    if not request.voice_enabled:
        return PersonalityNotifyResponse(
            status="success",
            message="Notification received (voice disabled)",
            engine="qwen3-tts"
        )

    try:
        text = request.message[:settings.MAX_TEXT_LENGTH]

        # Convert PersonalityConfig to internal Personality model
        personality = Personality(
            name=request.personality.name,
            description=f"Agent personality for {request.personality.name}",
            base_voice=request.personality.base_voice,
            enthusiasm=request.personality.enthusiasm,
            energy=request.personality.energy,
            expressiveness=request.personality.expressiveness,
            resilience=request.personality.resilience,
            composure=request.personality.composure,
            optimism=request.personality.optimism,
            warmth=request.personality.warmth,
            formality=request.personality.formality,
            directness=request.personality.directness,
            precision=request.personality.precision,
            curiosity=request.personality.curiosity,
            playfulness=request.personality.playfulness,
        )

        # Detect emotion from text/context (fast LLM inference)
        emotion_name, _ = await infer_emotion_with_llm(text, request.context)

        # Get personality-shaped expression
        expression = get_personality_emotion_expression(personality, emotion_name)

        # Build emotion instruction (simplified for CustomVoice)
        # CustomVoice uses simpler instructions - just the emotional quality
        emotion_instruct = f"{expression.vocal_qualities}, {expression.pacing}, {expression.intensity} intensity"

        logger.info(f"Personality voice: {personality.name} expressing {emotion_name}")
        logger.info(f"Expression: {expression.vocal_qualities}, {expression.pacing}")

        # Generate audio with CustomVoice - LOCKED speaker, personality-shaped emotion
        audio, sr = await tts_engine.generate_custom_voice(
            text=text,
            speaker=settings.DEFAULT_SPEAKER,  # Locked identity (Ryan)
            instruct=emotion_instruct,         # Personality-shaped emotion
            language=settings.DEFAULT_LANGUAGE
        )

        # Save and play
        audio_path = tts_engine.save_audio(audio, sr)
        await play_audio(audio_path, volume=request.volume, delete_after=True)

        return PersonalityNotifyResponse(
            status="success",
            message="Notification sent with personality expression",
            emotion_detected=emotion_name,
            expression={
                "vocal_qualities": expression.vocal_qualities,
                "pacing": expression.pacing,
                "intensity": expression.intensity,
                "notes": expression.additional_notes
            },
            full_instruction=emotion_instruct,
            engine="qwen3-tts"
        )

    except Exception as e:
        logger.error(f"Personality notification failed: {e}")
        return PersonalityNotifyResponse(
            status="error",
            message="Notification failed",
            engine="qwen3-tts",
            error=str(e)
        )


@app.post("/notify/personality/preview")
async def preview_personality_expression(request: PersonalityNotifyRequest):
    """
    Preview how personality shapes emotional expression without generating audio.

    Useful for testing and debugging personality configurations.
    """
    text = request.message

    # Convert to internal Personality
    personality = Personality(
        name=request.personality.name,
        description=f"Agent personality for {request.personality.name}",
        base_voice=request.personality.base_voice,
        enthusiasm=request.personality.enthusiasm,
        energy=request.personality.energy,
        expressiveness=request.personality.expressiveness,
        resilience=request.personality.resilience,
        composure=request.personality.composure,
        optimism=request.personality.optimism,
        warmth=request.personality.warmth,
        formality=request.personality.formality,
        directness=request.personality.directness,
        precision=request.personality.precision,
        curiosity=request.personality.curiosity,
        playfulness=request.personality.playfulness,
    )

    # Detect emotion
    emotion_name, _ = infer_emotion_heuristic(text)

    # Get personality-shaped expression
    expression = get_personality_emotion_expression(personality, emotion_name)

    # Build full instruction
    full_instruction = build_personality_voice_instruction(
        personality, emotion_name, expression
    )

    return {
        "text": text,
        "personality": request.personality.name,
        "emotion_detected": emotion_name,
        "expression": {
            "vocal_qualities": expression.vocal_qualities,
            "pacing": expression.pacing,
            "intensity": expression.intensity,
            "notes": expression.additional_notes
        },
        "full_instruction": full_instruction,
        "personality_traits_used": {
            "resilience": personality.resilience,
            "expressiveness": personality.expressiveness,
            "composure": personality.composure,
            "warmth": personality.warmth,
            "energy": personality.energy,
            "directness": personality.directness
        }
    }


# ============================================================================
# Run Server
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "server:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False,
        log_level="info"
    )
