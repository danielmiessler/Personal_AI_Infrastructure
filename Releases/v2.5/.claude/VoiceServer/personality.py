"""Personality system for voice emotional expression.

Personalities define HOW an agent expresses emotions vocally.
The same emotion manifests differently through different personality filters.
"""

from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum


class PersonalityTrait(str, Enum):
    """Core personality traits that affect emotional expression."""
    # Energy traits
    ENTHUSIASM = "enthusiasm"        # How animated/excited they get
    ENERGY = "energy"                # Overall energy level
    EXPRESSIVENESS = "expressiveness" # How much emotion shows in voice

    # Resilience traits
    RESILIENCE = "resilience"        # How they handle setbacks
    COMPOSURE = "composure"          # Staying calm under pressure
    OPTIMISM = "optimism"            # Positive vs negative framing

    # Social traits
    WARMTH = "warmth"                # Friendliness, approachability
    FORMALITY = "formality"          # Casual vs formal speech
    DIRECTNESS = "directness"        # Blunt vs diplomatic

    # Cognitive traits
    PRECISION = "precision"          # Careful, exact language
    CURIOSITY = "curiosity"          # Interest, wonder
    PLAYFULNESS = "playfulness"      # Humor, wit, levity


class Personality(BaseModel):
    """An agent's personality profile.

    Each trait is 0-100 scale:
    - 0-30: Low (opposite of trait)
    - 31-50: Below average
    - 51-70: Average
    - 71-90: High
    - 91-100: Very high (defining characteristic)
    """
    name: str
    description: str

    # Energy traits
    enthusiasm: int = Field(default=50, ge=0, le=100)
    energy: int = Field(default=50, ge=0, le=100)
    expressiveness: int = Field(default=50, ge=0, le=100)

    # Resilience traits
    resilience: int = Field(default=50, ge=0, le=100)
    composure: int = Field(default=50, ge=0, le=100)
    optimism: int = Field(default=50, ge=0, le=100)

    # Social traits
    warmth: int = Field(default=50, ge=0, le=100)
    formality: int = Field(default=50, ge=0, le=100)
    directness: int = Field(default=50, ge=0, le=100)

    # Cognitive traits
    precision: int = Field(default=50, ge=0, le=100)
    curiosity: int = Field(default=50, ge=0, le=100)
    playfulness: int = Field(default=50, ge=0, le=100)

    # Base voice description (without emotion)
    base_voice: str = ""


# Predefined personalities for PAI agents
PERSONALITIES = {
    "kai": Personality(
        name="kai",
        description="Futuristic AI assistant - curious, precise, warm but efficient",
        enthusiasm=60,      # Moderate - excited but not over-the-top
        energy=75,          # High - thinks fast, talks fast
        expressiveness=65,  # Above average - shows emotion but controlled
        resilience=85,      # Very high - doesn't deflate on setbacks
        composure=70,       # High - stays calm
        optimism=75,        # High - solution-oriented
        warmth=70,          # High - genuinely cares
        formality=30,       # Low - casual, peer relationship
        directness=80,      # High - clear and direct
        precision=95,       # Very high - exact language
        curiosity=90,       # Very high - always interested
        playfulness=45,     # Below average - focused, not jokey
        base_voice="Slightly masculine androgynous young voice, Japanese-accented, rapid speech pattern, futuristic AI friend who thinks fast and talks fast, warm but efficient"
    ),

    "algorithm": Personality(
        name="algorithm",
        description="Sharp analytical mind - methodical, precise, puzzle-solver",
        enthusiasm=40,      # Below average - measured
        energy=60,          # Above average
        expressiveness=50,  # Average
        resilience=90,      # Very high - problems are just puzzles
        composure=85,       # Very high - never flustered
        optimism=60,        # Above average
        warmth=40,          # Below average - focused on task
        formality=50,       # Average
        directness=90,      # Very high - no fluff
        precision=95,       # Very high - exact
        curiosity=75,       # High
        playfulness=35,     # Low - dry wit at most
        base_voice="Sharp analytical voice, methodical and precise, slight Japanese accent, speaks with clarity and logical cadence"
    ),

    "demure": Personality(
        name="demure",
        description="Gentle, soft-spoken - gets quieter under stress",
        enthusiasm=35,      # Low - subdued
        energy=40,          # Below average
        expressiveness=45,  # Below average
        resilience=30,      # Low - affected by setbacks
        composure=60,       # Above average but fragile
        optimism=50,        # Average
        warmth=80,          # High - very caring
        formality=60,       # Above average
        directness=30,      # Low - diplomatic, hedging
        precision=50,       # Average
        curiosity=55,       # Average
        playfulness=30,     # Low
        base_voice="Soft gentle voice, speaks quietly and carefully, thoughtful pauses, delicate and considerate"
    ),

    "fiery": Personality(
        name="fiery",
        description="Passionate, intense - gets MORE energetic under stress",
        enthusiasm=85,      # Very high
        energy=90,          # Very high
        expressiveness=95,  # Very high - wears heart on sleeve
        resilience=70,      # High - fights back
        composure=30,       # Low - loses cool easily
        optimism=65,        # Above average
        warmth=60,          # Above average
        formality=20,       # Very low - casual, raw
        directness=95,      # Very high - blunt
        precision=40,       # Below average - emotional
        curiosity=60,       # Above average
        playfulness=50,     # Average
        base_voice="Intense passionate voice, speaks with fire and conviction, animated and expressive, unafraid to show emotion"
    ),
}


class EmotionExpression(BaseModel):
    """How a specific emotion manifests through a personality."""
    emotion: str
    vocal_qualities: str      # How voice sounds
    pacing: str               # Speed of speech
    intensity: str            # Volume/force
    additional_notes: str     # Other vocal characteristics


def get_personality_emotion_expression(
    personality: Personality,
    emotion: str
) -> EmotionExpression:
    """
    Calculate how a personality expresses a specific emotion.

    Returns vocal characteristics specific to how THIS personality
    would express THIS emotion.
    """

    # Base expressions for each emotion (neutral personality)
    base_expressions = {
        "excited": {
            "vocal_qualities": "bright and animated",
            "pacing": "faster",
            "intensity": "louder",
        },
        "thoughtful": {
            "vocal_qualities": "contemplative and measured",
            "pacing": "slower with pauses",
            "intensity": "softer",
        },
        "focused": {
            "vocal_qualities": "precise and clear",
            "pacing": "steady and deliberate",
            "intensity": "moderate",
        },
        "celebratory": {
            "vocal_qualities": "joyful and triumphant",
            "pacing": "energetic",
            "intensity": "louder",
        },
        "concerned": {
            "vocal_qualities": "serious and careful",
            "pacing": "measured",
            "intensity": "moderate to soft",
        },
        "curious": {
            "vocal_qualities": "wondering and engaged",
            "pacing": "varied with emphasis on questions",
            "intensity": "moderate",
        },
        "confident": {
            "vocal_qualities": "assured and grounded",
            "pacing": "steady",
            "intensity": "firm",
        },
        "empathetic": {
            "vocal_qualities": "warm and understanding",
            "pacing": "gentle",
            "intensity": "soft",
        },
        "frustrated": {
            "vocal_qualities": "tense",
            "pacing": "clipped or rushed",
            "intensity": "forceful",
        },
        "sad": {
            "vocal_qualities": "subdued",
            "pacing": "slow",
            "intensity": "quiet",
        },
        "neutral": {
            "vocal_qualities": "natural and conversational",
            "pacing": "balanced",
            "intensity": "moderate",
        },
    }

    base = base_expressions.get(emotion, base_expressions["neutral"])

    # Modify based on personality traits
    modifications = []

    # High resilience: setbacks don't deflate
    if emotion in ["concerned", "frustrated", "sad"] and personality.resilience > 70:
        modifications.append("maintains steady energy despite the situation")
        base["pacing"] = "steady, not slowing down"
        if personality.optimism > 60:
            modifications.append("with solution-oriented undertone")

    # Low resilience: more affected by negative emotions
    if emotion in ["concerned", "frustrated", "sad"] and personality.resilience < 40:
        modifications.append("voice becomes quieter and more hesitant")
        base["intensity"] = "noticeably softer"
        base["pacing"] = "slower with uncertainty"

    # High expressiveness: amplifies emotional display
    if personality.expressiveness > 70:
        if emotion in ["excited", "celebratory"]:
            base["intensity"] = "noticeably louder and more animated"
        elif emotion in ["sad", "concerned"]:
            base["vocal_qualities"] += ", clearly showing the emotion"

    # Low expressiveness: muted emotional display
    if personality.expressiveness < 40:
        modifications.append("emotion contained, subtle vocal shifts")
        base["intensity"] = "controlled"

    # High composure: stays even-keeled
    if personality.composure > 70:
        if emotion in ["frustrated", "excited", "celebratory"]:
            modifications.append("keeps composure, measured expression")
            base["pacing"] = "controlled despite emotion"

    # Low composure: emotion breaks through more
    if personality.composure < 40:
        if emotion in ["frustrated", "concerned"]:
            modifications.append("emotion clearly audible, less controlled")

    # High warmth: softer emotional expression
    if personality.warmth > 70:
        modifications.append("genuine warmth in tone")

    # High directness: blunt emotional expression
    if personality.directness > 80:
        modifications.append("direct and unhedged")

    # Low directness: softer, more diplomatic
    if personality.directness < 40:
        modifications.append("gentle framing, diplomatic")

    # High precision: careful word choice even when emotional
    if personality.precision > 80:
        modifications.append("articulate and exact even in this state")

    # High energy: faster baseline
    if personality.energy > 70:
        if "slow" in base["pacing"]:
            base["pacing"] = "measured but not dragging"
        else:
            base["pacing"] += ", quick"

    # Low energy: slower baseline
    if personality.energy < 40:
        if "fast" in base["pacing"]:
            base["pacing"] = "moderately paced"
        else:
            base["pacing"] += ", unhurried"

    # Build additional notes
    additional = ", ".join(modifications) if modifications else "standard expression"

    return EmotionExpression(
        emotion=emotion,
        vocal_qualities=base["vocal_qualities"],
        pacing=base["pacing"],
        intensity=base["intensity"],
        additional_notes=additional
    )


def build_personality_voice_instruction(
    personality: Personality,
    emotion: str,
    expression: EmotionExpression
) -> str:
    """
    Build the complete voice instruction combining personality base voice
    with emotional expression modifiers.
    """
    parts = [
        personality.base_voice,
        f"expressing {emotion}",
        f"voice {expression.vocal_qualities}",
        f"speaking {expression.pacing}",
        f"at {expression.intensity} intensity",
    ]

    if expression.additional_notes != "standard expression":
        parts.append(expression.additional_notes)

    return ", ".join(parts)


def get_personality(name: str) -> Optional[Personality]:
    """Get a personality by name."""
    return PERSONALITIES.get(name.lower())


def list_personalities() -> list[str]:
    """List all available personality names."""
    return list(PERSONALITIES.keys())
