"""Audio playback for macOS using afplay."""

import asyncio
import subprocess
from pathlib import Path
from typing import Optional
import logging

logger = logging.getLogger(__name__)


async def play_audio(
    audio_path: Path | str,
    volume: float = 0.8,
    delete_after: bool = True
) -> bool:
    """
    Play audio file using macOS afplay.

    Args:
        audio_path: Path to the audio file
        volume: Playback volume (0.0 to 1.0)
        delete_after: Whether to delete the file after playing

    Returns:
        True if playback succeeded, False otherwise
    """
    audio_path = Path(audio_path)

    if not audio_path.exists():
        logger.error(f"Audio file not found: {audio_path}")
        return False

    try:
        # afplay volume is 0-255, but we use 0-1.0 scale
        afplay_volume = max(0, min(255, int(volume * 255)))

        # Run afplay asynchronously
        process = await asyncio.create_subprocess_exec(
            "afplay",
            "-v", str(volume),  # afplay uses 0.0-1.0 scale directly
            str(audio_path),
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE
        )

        _, stderr = await process.communicate()

        if process.returncode != 0:
            logger.error(f"afplay failed: {stderr.decode()}")
            return False

        logger.info(f"Played audio: {audio_path}")
        return True

    except FileNotFoundError:
        logger.error("afplay not found - is this macOS?")
        return False
    except Exception as e:
        logger.error(f"Audio playback error: {e}")
        return False
    finally:
        # Clean up temp file if requested
        if delete_after and audio_path.exists():
            try:
                audio_path.unlink()
                logger.debug(f"Deleted temp audio: {audio_path}")
            except Exception as e:
                logger.warning(f"Failed to delete temp audio: {e}")


def play_audio_sync(
    audio_path: Path | str,
    volume: float = 0.8,
    delete_after: bool = True
) -> bool:
    """Synchronous version of play_audio."""
    audio_path = Path(audio_path)

    if not audio_path.exists():
        logger.error(f"Audio file not found: {audio_path}")
        return False

    try:
        result = subprocess.run(
            ["afplay", "-v", str(volume), str(audio_path)],
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            logger.error(f"afplay failed: {result.stderr}")
            return False

        return True

    except FileNotFoundError:
        logger.error("afplay not found - is this macOS?")
        return False
    except Exception as e:
        logger.error(f"Audio playback error: {e}")
        return False
    finally:
        if delete_after and audio_path.exists():
            try:
                audio_path.unlink()
            except Exception:
                pass
