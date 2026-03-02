// ============================================================================
// pai-governance-guard — Zero-Dependency YAML Parser
// Handles the subset of YAML needed for governance policy files:
// mappings, sequences, scalars, comments, block scalars
// ============================================================================

type YamlValue = string | number | boolean | null | YamlValue[] | YamlMap;
interface YamlMap {
  [key: string]: YamlValue;
}

/**
 * Parse a YAML string into a JavaScript value.
 * Supports: mappings, sequences, scalars (string/number/boolean/null),
 * quoted strings, comments, block scalars (| and >).
 *
 * Does NOT support: anchors, aliases, tags, complex keys, flow collections.
 */
export function parseYaml(text: string): YamlValue {
  const lines = text.split(/\r?\n/);
  const processed: { indent: number; content: string; lineNum: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const stripped = stripComment(raw);
    if (stripped.trim().length === 0) continue;

    const indent = countIndent(raw);
    processed.push({ indent, content: stripped.trim(), lineNum: i + 1 });
  }

  if (processed.length === 0) {
    throw new Error("YAML parse error: empty document");
  }

  const { value } = parseValue(processed, 0, -1);
  return value;
}

function stripComment(line: string): string {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    if (ch === '"' && !inSingle) inDouble = !inDouble;
    if (ch === "#" && !inSingle && !inDouble) {
      if (i === 0 || line[i - 1] === " ") {
        return line.slice(0, i);
      }
    }
  }
  return line;
}

function countIndent(line: string): number {
  let n = 0;
  for (const ch of line) {
    if (ch === " ") n++;
    else break;
  }
  return n;
}

interface ParseResult {
  value: YamlValue;
  nextIndex: number;
}

function parseValue(
  lines: { indent: number; content: string; lineNum: number }[],
  startIndex: number,
  parentIndent: number
): ParseResult {
  if (startIndex >= lines.length) {
    return { value: null, nextIndex: startIndex };
  }

  const first = lines[startIndex];

  // Check if this is a sequence
  if (first.content.startsWith("- ") || first.content === "-") {
    return parseSequence(lines, startIndex, first.indent);
  }

  // Check if this is a mapping
  const colonIdx = findMappingColon(first.content);
  if (colonIdx >= 0) {
    return parseMapping(lines, startIndex, first.indent);
  }

  // Bare scalar
  return { value: parseScalar(first.content), nextIndex: startIndex + 1 };
}

function parseMapping(
  lines: { indent: number; content: string; lineNum: number }[],
  startIndex: number,
  baseIndent: number
): ParseResult {
  const result: YamlMap = {};
  let i = startIndex;

  while (i < lines.length) {
    const line = lines[i];

    // Stop if indent decreased below our base
    if (line.indent < baseIndent) break;
    // Skip lines at deeper indent (handled by recursion)
    if (line.indent > baseIndent) break;

    const colonIdx = findMappingColon(line.content);
    if (colonIdx < 0) break;

    const key = line.content.slice(0, colonIdx).trim();
    const afterColon = line.content.slice(colonIdx + 1).trim();

    if (afterColon === "|" || afterColon === ">") {
      // Block scalar
      const fold = afterColon === ">";
      const { value, nextIndex } = parseBlockScalar(lines, i + 1, baseIndent, fold);
      result[key] = value;
      i = nextIndex;
    } else if (afterColon.length > 0) {
      // Inline value
      result[key] = parseScalar(afterColon);
      i++;
    } else {
      // Nested value on next lines
      if (i + 1 < lines.length && lines[i + 1].indent > baseIndent) {
        const nested = parseValue(lines, i + 1, baseIndent);
        result[key] = nested.value;
        i = nested.nextIndex;
      } else {
        result[key] = null;
        i++;
      }
    }
  }

  return { value: result, nextIndex: i };
}

function parseSequence(
  lines: { indent: number; content: string; lineNum: number }[],
  startIndex: number,
  baseIndent: number
): ParseResult {
  const result: YamlValue[] = [];
  let i = startIndex;

  while (i < lines.length) {
    const line = lines[i];

    if (line.indent < baseIndent) break;
    if (line.indent > baseIndent) break;

    if (!line.content.startsWith("- ") && line.content !== "-") break;

    const afterDash = line.content === "-" ? "" : line.content.slice(2).trim();

    if (afterDash.length === 0) {
      // Nested value on next lines
      if (i + 1 < lines.length && lines[i + 1].indent > baseIndent) {
        const nested = parseValue(lines, i + 1, baseIndent);
        result.push(nested.value);
        i = nested.nextIndex;
      } else {
        result.push(null);
        i++;
      }
    } else {
      // Check if the item value is a mapping (e.g., "- key: value")
      const itemColonIdx = findMappingColon(afterDash);
      if (itemColonIdx >= 0) {
        // Sequence of mappings: parse the first key-value inline,
        // then collect remaining keys at deeper indent
        const itemKey = afterDash.slice(0, itemColonIdx).trim();
        const itemVal = afterDash.slice(itemColonIdx + 1).trim();
        const obj: YamlMap = {};
        obj[itemKey] = itemVal.length > 0 ? parseScalar(itemVal) : null;

        // Collect continuation keys at deeper indent
        const itemIndent = baseIndent + 2; // standard indent for sequence item continuation
        let j = i + 1;
        while (j < lines.length && lines[j].indent >= itemIndent) {
          const subLine = lines[j];
          if (subLine.indent > baseIndent) {
            const subColonIdx = findMappingColon(subLine.content);
            if (subColonIdx >= 0) {
              const subKey = subLine.content.slice(0, subColonIdx).trim();
              const subAfter = subLine.content.slice(subColonIdx + 1).trim();
              if (subAfter.length > 0) {
                obj[subKey] = parseScalar(subAfter);
                j++;
              } else {
                // Nested value
                if (j + 1 < lines.length && lines[j + 1].indent > subLine.indent) {
                  const nested = parseValue(lines, j + 1, subLine.indent);
                  obj[subKey] = nested.value;
                  j = nested.nextIndex;
                } else {
                  obj[subKey] = null;
                  j++;
                }
              }
            } else {
              break;
            }
          } else {
            break;
          }
        }
        result.push(obj);
        i = j;
      } else {
        // Simple scalar item
        result.push(parseScalar(afterDash));
        i++;
      }
    }
  }

  return { value: result, nextIndex: i };
}

function parseBlockScalar(
  lines: { indent: number; content: string; lineNum: number }[],
  startIndex: number,
  parentIndent: number,
  fold: boolean
): ParseResult {
  const blockLines: string[] = [];
  let i = startIndex;
  let blockIndent = -1;

  while (i < lines.length) {
    const line = lines[i];
    if (line.indent <= parentIndent) break;

    if (blockIndent < 0) blockIndent = line.indent;
    if (line.indent < blockIndent) break;

    blockLines.push(line.content);
    i++;
  }

  const joined = fold
    ? blockLines.join(" ").replace(/\s+/g, " ").trim()
    : blockLines.join("\n");

  return { value: joined, nextIndex: i };
}

function findMappingColon(content: string): number {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    if (ch === '"' && !inSingle) inDouble = !inDouble;
    if (ch === ":" && !inSingle && !inDouble) {
      // Must be followed by space, end of string, or be at end
      if (i + 1 >= content.length || content[i + 1] === " ") {
        return i;
      }
    }
  }
  return -1;
}

function parseScalar(value: string): string | number | boolean | null {
  if (value === "null" || value === "~" || value === "") return null;
  if (value === "true" || value === "True" || value === "TRUE") return true;
  if (value === "false" || value === "False" || value === "FALSE") return false;

  // Quoted strings
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    const inner = value.slice(1, -1);
    // Handle basic escape sequences for double-quoted strings
    if (value.startsWith('"')) {
      return inner
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
    return inner;
  }

  // Numbers
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);

  return value;
}
