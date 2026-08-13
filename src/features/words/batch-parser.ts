export interface ParsedBatchTerms {
  terms: string[];
  inputCount: number;
  blankCount: number;
  duplicateCount: number;
  tooLongCount: number;
}

export function parseBatchTerms(input: string): ParsedBatchTerms {
  const lines = input.split(/\r?\n/);
  const seen = new Set<string>();
  const terms: string[] = [];
  let blankCount = 0;
  let duplicateCount = 0;
  let tooLongCount = 0;

  for (const line of lines) {
    const term = line.trim();
    if (!term) {
      blankCount += 1;
      continue;
    }
    if (term.length > 100) {
      tooLongCount += 1;
      continue;
    }
    const normalized = term.toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(normalized)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(normalized);
    terms.push(term);
  }

  return {
    terms,
    inputCount: lines.length,
    blankCount,
    duplicateCount,
    tooLongCount,
  };
}
