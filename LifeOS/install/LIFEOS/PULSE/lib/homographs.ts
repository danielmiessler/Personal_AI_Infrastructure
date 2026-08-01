/**
 * Homograph disambiguation for text-to-speech.
 *
 * Some words share spelling but differ in sound by sense. ElevenLabs guesses
 * the reading from context and sometimes picks wrong. The worst offender is
 * "live": the broadcast/adjective sense (/laɪv/ — "the site is live", "go
 * live") gets read as the verb (/lɪv/ — "live freely", "where you live").
 *
 * The verb is ElevenLabs' default reading and comes out right, so we leave it
 * alone. We respell ONLY the broadcast-sense occurrences ("live" -> "lyve") so
 * the model reads them as /laɪv/. Detection is by high-precision context, not a
 * blanket rule — a flat substitution would wreck "live freely".
 *
 * Each context regex contains the homograph; only the homograph token inside a
 * match is respelled, so a sentence mixing both senses stays correct.
 *
 * Shared by the VoiceServer (PRONUNCIATIONS pipeline) and any remote-channel voice
 * path so every spoken channel reads "live" the same way.
 */

interface Homograph {
  word: string
  respell: string
  contexts: RegExp[]
}

const HOMOGRAPHS: Homograph[] = [
  {
    word: "live",
    respell: "lyve", // → /laɪv/
    contexts: [
      // "go / went / going / staying live"
      /\b(?:go|goes|going|gonna go|went|stay|stays|staying)\s+live\b/gi,
      // "is / was / now / currently live"
      /\b(?:is|are|am|was|were|be|been|it'?s|now|then|currently)\s+live\b/gi,
      // "live on <domain>", "live in production", "live site/deploy/stream/…",
      // and the verification cadence "live and verified"
      /\blive\s+(?:on\s+\S+\.\w{2,}|in\s+production|site|deploy|deployment|stream|broadcast|show|event|demo|version|audience|and\s+verified)\b/gi,
      // "watch / stream / airing … live"
      /\b(?:watch|watching|stream|streaming|airs|airing|broadcast|broadcasting)\b[^.?!]*\blive\b/gi,
      // hyphenated ship cadence anywhere: "live-verified", "live-verify", "live-tested", "live-checked"
      /\blive-(?:verif\w+|test\w+|check\w+)/gi,
      // ship/deploy verbs near live: "deployed live", "shipped it live", "pushed live", "launched live", "rolled out live"
      /\b(?:deploy(?:ed|ing)?|ship(?:ped|ping)?|push(?:ed|ing)?|launch(?:ed|ing)?|rolled\s+out|roll\s+out|going\s+out|go\s+out)\b[^.?!]{0,20}\blive\b/gi,
      // "verified / tested / running live"
      /\b(?:verif\w+|tested|testing|running|runs|run)\s+live\b/gi,
    ],
  },
]

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Match the leading-cap pattern of the original token onto the respelling. */
function matchCase(original: string, respell: string): string {
  const isCapitalized =
    original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase()
  return isCapitalized ? respell[0].toUpperCase() + respell.slice(1) : respell
}

export function disambiguateHomographs(text: string): string {
  let result = text
  for (const h of HOMOGRAPHS) {
    const wordRe = new RegExp(`\\b${escapeRegex(h.word)}\\b`, "gi")
    for (const ctx of h.contexts) {
      result = result.replace(ctx, (match) =>
        match.replace(wordRe, (w) => matchCase(w, h.respell)),
      )
    }
  }
  return result
}
