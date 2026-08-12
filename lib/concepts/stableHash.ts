/**
 * A stable 64-bit FNV-1a variant, rendered hex.
 *
 * Every concept module that needs an identifier needs the same three
 * properties: deterministic across processes, synchronous in every runtime this
 * code runs in — which `crypto.subtle` is not — and stable across reruns, so
 * harvesting the same site or re-pasting the same text does not renumber the
 * review keys.
 *
 * It is not a security primitive. Collision resistance across a few dozen short
 * strings inside one concept document is the entire requirement; file identity
 * uses Convex's own SHA-256 instead.
 */
export function stableHash(value: string): string {
  let low = 0x811c9dc5;
  let high = 0x01000193;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    low = Math.imul(low ^ code, 0x01000193) >>> 0;
    high = Math.imul(high ^ (code + index), 0x85ebca6b) >>> 0;
  }
  return low.toString(16).padStart(8, "0") + high.toString(16).padStart(8, "0");
}
