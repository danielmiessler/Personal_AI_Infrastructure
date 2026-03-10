"""Qwen3-TTS Engine Wrapper."""

import asyncio
import logging
import time
from pathlib import Path
from typing import Optional, Tuple
import json

import soundfile as sf
import numpy as np

from config import settings
from models import VoicePrompt, VoicePromptIndex

logger = logging.getLogger(__name__)


class Qwen3TTSEngine:
    """Wrapper for Qwen3-TTS model with voice design and cloning capabilities."""

    def __init__(
        self,
        model_size: str = "1.7B",
        model_type: str = "CustomVoice",
        lazy_load: bool = True
    ):
        """
        Initialize the TTS engine.

        Args:
            model_size: "1.7B" for best quality, "0.6B" for lightweight
            model_type: "CustomVoice" (locked speaker), "VoiceDesign", or "Base"
            lazy_load: If True, defer model loading until first use
        """
        self.model_size = model_size
        self.model_type = model_type
        self.model = None
        self._model_loaded = False
        self._loading = False

        # Model name from settings (already computed there)
        self.model_name = settings.MODEL_NAME

        # Voice prompt storage
        self.voice_prompts: dict[str, VoicePrompt] = {}
        self._load_voice_prompts()

        if not lazy_load:
            self._load_model()

    def _load_model(self):
        """Load the Qwen3-TTS model."""
        if self._model_loaded or self._loading:
            return

        self._loading = True
        logger.info(f"Loading Qwen3-TTS model: {self.model_name}")
        start = time.time()

        try:
            from qwen_tts import Qwen3TTSModel

            self.model = Qwen3TTSModel.from_pretrained(
                self.model_name,
                device_map="auto",
                torch_dtype="auto"
            )
            self._model_loaded = True
            logger.info(f"Model loaded in {time.time() - start:.1f}s")

        except ImportError as e:
            logger.error(f"Failed to import qwen_tts: {e}")
            logger.error("Install with: pip install qwen-tts")
            raise
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
        finally:
            self._loading = False

    def _ensure_model_loaded(self):
        """Ensure the model is loaded before inference."""
        if not self._model_loaded:
            self._load_model()

    @property
    def is_loaded(self) -> bool:
        """Check if model is loaded."""
        return self._model_loaded

    def _load_voice_prompts(self):
        """Load saved voice prompts from disk."""
        index_path = settings.VOICE_PROMPTS_DIR / "index.json"

        if index_path.exists():
            try:
                with open(index_path) as f:
                    data = json.load(f)
                    index = VoicePromptIndex(**data)
                    self.voice_prompts = index.prompts
                    logger.info(f"Loaded {len(self.voice_prompts)} voice prompts")
            except Exception as e:
                logger.error(f"Failed to load voice prompts: {e}")
                self.voice_prompts = {}
        else:
            self.voice_prompts = {}

    def _save_voice_prompts(self):
        """Save voice prompts to disk."""
        index_path = settings.VOICE_PROMPTS_DIR / "index.json"

        try:
            index = VoicePromptIndex(prompts=self.voice_prompts)
            with open(index_path, "w") as f:
                json.dump(index.model_dump(mode="json"), f, indent=2, default=str)
            logger.info(f"Saved {len(self.voice_prompts)} voice prompts")
        except Exception as e:
            logger.error(f"Failed to save voice prompts: {e}")

    def save_voice_prompt(self, prompt: VoicePrompt) -> bool:
        """Save a voice prompt."""
        self.voice_prompts[prompt.name] = prompt
        self._save_voice_prompts()

        # Also save individual prompt file
        prompt_path = settings.VOICE_PROMPTS_DIR / "prompts" / f"{prompt.name}.json"
        try:
            with open(prompt_path, "w") as f:
                json.dump(prompt.model_dump(mode="json"), f, indent=2, default=str)
            return True
        except Exception as e:
            logger.error(f"Failed to save individual prompt: {e}")
            return False

    def get_voice_prompt(self, name: str) -> Optional[VoicePrompt]:
        """Get a voice prompt by name."""
        return self.voice_prompts.get(name)

    def delete_voice_prompt(self, name: str) -> bool:
        """Delete a voice prompt."""
        if name not in self.voice_prompts:
            return False

        del self.voice_prompts[name]
        self._save_voice_prompts()

        # Delete individual file
        prompt_path = settings.VOICE_PROMPTS_DIR / "prompts" / f"{name}.json"
        if prompt_path.exists():
            prompt_path.unlink()

        return True

    def list_voice_prompts(self) -> list[VoicePrompt]:
        """List all saved voice prompts."""
        return list(self.voice_prompts.values())

    async def generate_voice_design(
        self,
        text: str,
        description: str,
        language: str = "en"
    ) -> Tuple[np.ndarray, int]:
        """
        Generate speech using voice design (natural language description).

        Args:
            text: Text to speak
            description: Natural language description of desired voice
            language: Language code

        Returns:
            Tuple of (audio_array, sample_rate)
        """
        self._ensure_model_loaded()

        logger.info(f"Generating voice design: '{description[:50]}...'")
        start = time.time()

        # Map language codes
        lang_map = {
            "en": "English",
            "zh": "Chinese",
            "ja": "Japanese",
            "ko": "Korean",
            "de": "German",
            "fr": "French",
            "ru": "Russian",
            "pt": "Portuguese",
            "es": "Spanish",
            "it": "Italian"
        }
        qwen_language = lang_map.get(language, "English")

        try:
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            wavs, sr = await loop.run_in_executor(
                None,
                lambda: self.model.generate_voice_design(
                    text=text,
                    language=qwen_language,
                    instruct=description
                )
            )

            # wavs is a list of arrays - take the first one
            wav = wavs[0] if isinstance(wavs, list) else wavs

            # Convert to numpy if needed
            if hasattr(wav, 'cpu'):
                wav = wav.cpu().numpy()

            logger.info(f"Voice design generated in {time.time() - start:.2f}s")
            return wav, sr

        except Exception as e:
            logger.error(f"Voice design generation failed: {e}")
            raise

    async def generate_voice_clone(
        self,
        text: str,
        ref_audio_path: str,
        ref_text: str,
        language: str = "en"
    ) -> Tuple[np.ndarray, int]:
        """
        Generate speech using voice cloning.

        Args:
            text: Text to speak
            ref_audio_path: Path to reference audio
            ref_text: Transcript of reference audio
            language: Language code

        Returns:
            Tuple of (audio_array, sample_rate)
        """
        self._ensure_model_loaded()

        logger.info(f"Cloning voice from: {ref_audio_path}")
        start = time.time()

        lang_map = {
            "en": "English",
            "zh": "Chinese",
            "ja": "Japanese",
            "ko": "Korean",
            "de": "German",
            "fr": "French",
            "ru": "Russian",
            "pt": "Portuguese",
            "es": "Spanish",
            "it": "Italian"
        }
        qwen_language = lang_map.get(language, "English")

        try:
            loop = asyncio.get_event_loop()
            wavs, sr = await loop.run_in_executor(
                None,
                lambda: self.model.generate_voice_clone(
                    text=text,
                    language=qwen_language,
                    ref_audio=ref_audio_path,
                    ref_text=ref_text
                )
            )

            # wavs is a list of arrays - take the first one
            wav = wavs[0] if isinstance(wavs, list) else wavs

            if hasattr(wav, 'cpu'):
                wav = wav.cpu().numpy()

            logger.info(f"Voice clone generated in {time.time() - start:.2f}s")
            return wav, sr

        except Exception as e:
            logger.error(f"Voice clone generation failed: {e}")
            raise

    async def generate_custom_voice(
        self,
        text: str,
        speaker: str = "Ryan",
        instruct: Optional[str] = None,
        language: str = "en"
    ) -> Tuple[np.ndarray, int]:
        """
        Generate speech using CustomVoice - LOCKED speaker identity with emotional control.

        This is the RECOMMENDED method for consistent voice output. The speaker identity
        is fixed (no regeneration), while emotional expression varies via instruct.

        Args:
            text: Text to speak
            speaker: One of 9 preset speakers (English: "Ryan", "Aiden")
            instruct: Optional emotional/style instruction (e.g., "excited and energetic")
            language: Language code

        Returns:
            Tuple of (audio_array, sample_rate)
        """
        self._ensure_model_loaded()

        logger.info(f"CustomVoice: speaker={speaker}, instruct={instruct[:30] if instruct else 'none'}...")
        start = time.time()

        lang_map = {
            "en": "English",
            "zh": "Chinese",
            "ja": "Japanese",
            "ko": "Korean",
            "de": "German",
            "fr": "French",
            "ru": "Russian",
            "pt": "Portuguese",
            "es": "Spanish",
            "it": "Italian"
        }
        qwen_language = lang_map.get(language, "English")

        try:
            loop = asyncio.get_event_loop()

            # Build kwargs - instruct is optional
            gen_kwargs = {
                "text": text,
                "language": qwen_language,
                "speaker": speaker,
            }
            if instruct:
                gen_kwargs["instruct"] = instruct

            wavs, sr = await loop.run_in_executor(
                None,
                lambda: self.model.generate_custom_voice(**gen_kwargs)
            )

            # wavs is a list of arrays - take the first one
            wav = wavs[0] if isinstance(wavs, list) else wavs

            if hasattr(wav, 'cpu'):
                wav = wav.cpu().numpy()

            logger.info(f"CustomVoice generated in {time.time() - start:.2f}s")
            return wav, sr

        except Exception as e:
            logger.error(f"CustomVoice generation failed: {e}")
            raise

    async def generate_with_prompt(
        self,
        text: str,
        voice_name: str
    ) -> Tuple[np.ndarray, int]:
        """
        Generate speech using a saved voice prompt.

        Args:
            text: Text to speak
            voice_name: Name of saved voice prompt

        Returns:
            Tuple of (audio_array, sample_rate)
        """
        prompt = self.get_voice_prompt(voice_name)
        if not prompt:
            raise ValueError(f"Voice prompt not found: {voice_name}")

        if prompt.type == "cloned" and prompt.ref_audio_path:
            return await self.generate_voice_clone(
                text=text,
                ref_audio_path=prompt.ref_audio_path,
                ref_text=prompt.ref_text or "",
                language=prompt.language
            )
        else:
            return await self.generate_voice_design(
                text=text,
                description=prompt.instruct,
                language=prompt.language
            )

    def save_audio(
        self,
        audio: np.ndarray,
        sample_rate: int,
        path: Optional[Path] = None
    ) -> Path:
        """
        Save audio to file.

        Args:
            audio: Audio array
            sample_rate: Sample rate
            path: Optional output path (generates temp path if None)

        Returns:
            Path to saved audio file
        """
        if path is None:
            path = settings.TEMP_AUDIO_DIR / f"qwen3-{int(time.time() * 1000)}.wav"

        path.parent.mkdir(parents=True, exist_ok=True)

        # Ensure audio is in correct shape
        if audio.ndim > 1:
            audio = audio.squeeze()

        sf.write(str(path), audio, sample_rate)
        logger.debug(f"Saved audio to: {path}")

        return path
