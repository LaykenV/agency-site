/**
 * Shared deterministic rendering for legal documents.
 *
 * Both the MSA and per-project order forms are hashed (SHA-256) at agreement
 * acceptance, so their canonical HTML must be byte-stable for a given input.
 * Nothing in here may read the clock, the environment, or a random source.
 */

export type LegalContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered?: boolean; items: Array<string> }
  | { type: "subheading"; text: string };

export type LegalSection = {
  anchor: string;
  title: string;
  blocks: Array<LegalContentBlock>;
};

export type LegalSummaryPoint = {
  label: string;
  value: string;
  html?: string;
};

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const renderBlockToHtml = (block: LegalContentBlock): string => {
  if (block.type === "paragraph") {
    return `<p>${escapeHtml(block.text)}</p>`;
  }
  if (block.type === "subheading") {
    return `<h3>${escapeHtml(block.text)}</h3>`;
  }
  const tag = block.ordered ? "ol" : "ul";
  const items = block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `<${tag}>${items}</${tag}>`;
};

export const renderSectionsToHtml = (sections: Array<LegalSection>): string =>
  sections
    .map((section) => {
      const blocks = section.blocks.map(renderBlockToHtml).join("");
      return `
      <section id="${escapeHtml(section.anchor)}">
        <h2>${escapeHtml(section.title)}</h2>
        ${blocks}
      </section>
    `;
    })
    .join("");

export const renderSummaryListToHtml = (
  points: Array<LegalSummaryPoint>,
): string =>
  points
    .map((item) => {
      const value = item.html ?? escapeHtml(item.value);
      return `<li><strong>${escapeHtml(item.label)}:</strong> ${value}</li>`;
    })
    .join("");
