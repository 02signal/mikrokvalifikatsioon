// Explicit programme lineage is AMOS's authoritative answer for an id rename.
// Keep this separate from the redirect generator so the safety invariants can
// be tested with small synthetic feeds.

// Byte-identical with AMOS PROGRAMME_REF_RE.
export const CANONICAL_PROGRAM_ID = /^[a-z0-9][a-z0-9_-]{1,120}$/;

/**
 * Return the explicit old-id -> current-id aliases declared by active v2 feed
 * rows. A declared lineage pair is never best-effort: invalid values fail the
 * generation instead of being silently reinterpreted by name-based inference.
 */
export function explicitPreviousIdAliases(activePrograms) {
  const liveIds = new Set(activePrograms.map((program) => program.id));
  const aliases = new Map();

  for (const program of activePrograms) {
    const hasPreviousIds = Object.hasOwn(program, "previousIds");
    const hasDecisionRef = Object.hasOwn(program, "lineageDecisionRef");
    if (!hasPreviousIds && !hasDecisionRef) continue; // old feed: inference remains available

    if (!hasPreviousIds || !hasDecisionRef) {
      throw new Error(`[gen] explicit lineage for ${program.id} must include both previousIds and lineageDecisionRef`);
    }
    if (!Array.isArray(program.previousIds) || !program.previousIds.length) {
      throw new Error(`[gen] explicit lineage for ${program.id} has an empty or invalid previousIds array`);
    }
    if (typeof program.lineageDecisionRef !== "string" || !program.lineageDecisionRef.trim()) {
      throw new Error(`[gen] explicit lineage for ${program.id} has an invalid lineageDecisionRef`);
    }

    const rowIds = new Set();
    for (const previousId of program.previousIds) {
      if (typeof previousId !== "string" || !CANONICAL_PROGRAM_ID.test(previousId)) {
        throw new Error(`[gen] explicit lineage for ${program.id} has invalid previous id: ${String(previousId)}`);
      }
      if (rowIds.has(previousId)) {
        throw new Error(`[gen] explicit lineage for ${program.id} repeats previous id: ${previousId}`);
      }
      if (previousId === program.id) {
        throw new Error(`[gen] explicit lineage for ${program.id} must not include its current id`);
      }
      if (liveIds.has(previousId)) {
        throw new Error(`[gen] explicit lineage for ${program.id} points at active id: ${previousId}`);
      }
      if (aliases.has(previousId)) {
        throw new Error(`[gen] explicit lineage collision for previous id ${previousId}`);
      }
      rowIds.add(previousId);
      aliases.set(previousId, program.id);
    }
  }

  return aliases;
}
