export interface ParsedAgent1Output {
  draftScript: string;
  selectionReport: string;
  sources: string[];
  fallbackUsed: boolean;
}

export function parseAgent1Output(raw: string): ParsedAgent1Output {
  const draftMatch = raw.match(/## FIRST DRAFT SCRIPT\s*\n?([\s\S]*?)(?=## STORY SELECTION REPORT|$)/i);
  const reportMatch = raw.match(/## STORY SELECTION REPORT\s*\n?([\s\S]*)/i);

  const draftScript = draftMatch ? draftMatch[1].trim() : raw.trim();
  const selectionReport = reportMatch ? reportMatch[1].trim() : '';

  // Extract sources from selection report
  const sourceMatches = selectionReport.match(/Source:\s*([^\n]+)/gi);
  const sources = sourceMatches
    ? sourceMatches.map((m) => m.replace(/Source:\s*/i, '').trim())
    : [];

  // Detect fallback usage
  const fallbackUsed =
    /fallback\s*used:\s*yes/i.test(selectionReport) ||
    /fallback\s*to\s*general\s*news:\s*yes/i.test(selectionReport);

  return {
    draftScript,
    selectionReport,
    sources,
    fallbackUsed,
  };
}
