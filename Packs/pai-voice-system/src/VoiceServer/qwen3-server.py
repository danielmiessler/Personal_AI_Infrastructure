#!/usr/bin/env python3
"""Qwen3-TTS Internal API Server (Port 8889)

This server only generates audio - playback is handled by TypeScript main server.
It provides a lightweight HTTP API for TTS generation without audio playback logic.

Endpoints:
  POST /tts/generate - Generate WAV audio from text
  GET /health - Health check

Usage:
  python qwen3-server.py
  # Or with custom port:
  QWEN3_INTERNAL_PORT=8889 python qwen3-server.py
"""

import os
import io
import asyncio
import logging
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
import soundfile as sf

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(name)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Import TTS engine (from same directory)
from tts_engine import Qwen3TTSEngine
from config import settings

# Server configuration
PORT = int(os.environ.get("QWEN3_INTERNAL_PORT", "8889"))

# Initialize FastAPI
app = FastAPI(
    title="Qwen3-TTS Internal API",
    description="Internal TTS generation service for PAI Voice Server",
    version="1.0.0"
)

# Lazy-load TTS engine
_engine: Optional[Qwen3TTSEngine] = None


def get_engine() -> Qwen3TTSEngine:
    """Get or create TTS engine instance (lazy loading)."""
    global _engine
    if _engine is None:
        logger.info("Loading Qwen3-TTS engine...")
        _engine = Qwen3TTSEngine(
            model_type=settings.MODEL_TYPE,
            model_size=settings.MODEL_SIZE,
            lazy_load=False  # Load immediately when first accessed
        )
        logger.info("Qwen3-TTS engine loaded")
    return _engine


# Request/Response models
class TTSRequest(BaseModel):
    """TTS generation request."""
    text: str
    speaker: str = "Ryan"
    instruct: Optional[str] = None
    language: str = "en"


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    engine: str
    model: str
    model_loaded: bool
    port: int


@app.post("/tts/generate")
async def generate_tts(request: TTSRequest) -> Response:
    """Generate WAV audio from text.

    Returns raw WAV audio bytes with audio/wav content type.
    The TypeScript server handles playback.
    """
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")

    if len(request.text) > settings.MAX_TEXT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Text too long (max {settings.MAX_TEXT_LENGTH} chars)"
        )

    try:
        engine = get_engine()

        logger.info(f"Generating TTS: speaker={request.speaker}, text={request.text[:50]}...")

        # Generate audio using CustomVoice mode (async method)
        audio, sr = await engine.generate_custom_voice(
            text=request.text,
            speaker=request.speaker,
            instruct=request.instruct,
            language=request.language
        )

        # Convert numpy array to WAV bytes
        buffer = io.BytesIO()
        sf.write(buffer, audio, sr, format='WAV')
        buffer.seek(0)
        wav_bytes = buffer.read()

        logger.info(f"Generated {len(wav_bytes)} bytes of audio")

        return Response(
            content=wav_bytes,
            media_type="audio/wav",
            headers={
                "Content-Disposition": "inline",
                "X-Sample-Rate": str(sr),
                "X-Speaker": request.speaker
            }
        )

    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    engine_loaded = _engine is not None

    return HealthResponse(
        status="healthy",
        engine="qwen3-tts",
        model=settings.MODEL_NAME,
        model_loaded=engine_loaded,
        port=PORT
    )


@app.on_event("startup")
async def startup_event():
    """Log startup information."""
    logger.info("=" * 60)
    logger.info("Qwen3-TTS Internal API Server Starting")
    logger.info(f"Port: {PORT}")
    logger.info(f"Model: {settings.MODEL_NAME}")
    logger.info(f"Speaker: {settings.DEFAULT_SPEAKER}")
    logger.info("=" * 60)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=PORT,
        log_level="info"
    )
