/**
 * classify.ts — Deterministic mode classification logic
 *
 * Extracted from ModeClassifier.hook.ts so both the hook and tests
 * import the same function — no logic drift between hook and test suite.
 *
 * MODES:
 * - MINIMAL:   greetings, ratings (1-10), short acknowledgments
 * - ALGORITHM: action verb + (technical object OR multi-step complexity)
 * - NATIVE:    everything else
 */

export type Mode = 'MINIMAL' | 'ALGORITHM' | 'NATIVE';

export function classify(prompt: string): Mode {
  const trimmed = prompt.trim();

  // Minimal: greetings, ratings (1-10), short acknowledgments
  const isMinimal = /^(hi|hello|hey|thanks|thank you|ok|okay|done|got it|sure|yes|no|yep|nope|\d+[\s\-:]*)$/i.test(trimmed);
  if (isMinimal) return 'MINIMAL';
  if (!trimmed || trimmed.length < 2) return 'NATIVE';

  // ALGORITHM requires BOTH gates to pass:
  // Gate 1: action verb present
  const hasActionVerb = /\b(build|create|implement|fix|debug|refactor|analyze|write|design|review|plan|add|update|remove|set|migrate|convert|optimize|investigate|research|develop|configure|deploy|install|test|audit|generate|scaffold|integrate|setup|set up)\b/i.test(trimmed);

  // Gate 2: technical object present OR multi-step complexity
  const hasTechnicalObject = /\b(code|file|function|class|method|api|endpoint|database|schema|config|hook|script|test|build|deploy|server|component|module|service|bug|error|feature|algorithm|query|migration|route|middleware|model|controller|template|pipeline|workflow|repo|branch|commit|container|package|dependency|type|interface|struct)\b/i.test(trimmed);
  const words = trimmed.split(/\s+/);
  const isComplex = words.length > 30 || /\b(and then|also|step|first|second|finally)\b|\d+\)/i.test(trimmed);

  const isAlgorithm = hasActionVerb && (hasTechnicalObject || isComplex);

  return isAlgorithm ? 'ALGORITHM' : 'NATIVE';
}
