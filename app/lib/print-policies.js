/** Canonical print commerce copy — keep FAQ and product detail tabs in sync. */

export const PRINT_FAQ_SECTIONS = [
  {
    id: 'shipping',
    title: 'Shipping & Returns',
    paragraphs: [
      'Shipping is free on every order. Each print is made to order and ships within 14 business days.',
      'Framed prints are carefully packed and shipped ready to hang. Unframed prints ship rolled in a protective poster tube.',
      'We do not accept returns on made-to-order work.',
    ],
  },
  {
    id: 'sizing',
    title: 'Sizing',
    paragraphs: [
      'Prints are offered in six sizes, from Small (8×12″) through Exhibition (40×60″), all in a 2:3 aspect ratio.',
      'Choose a white mat border or a full-bleed presentation without a mat. Outer dimensions include the frame and mat when selected.',
    ],
  },
  {
    id: 'printing',
    title: 'Printing & Framing',
    paragraphs: [
      'Archival pigment prints on cotton rag paper, produced and framed locally in Canada.',
      'Frames are available in black or white with a standard mat border, or unframed if you prefer to frame it yourself.',
    ],
  },
];

/** @param {string} id */
export function getPrintFaqSection(id) {
  return PRINT_FAQ_SECTIONS.find((section) => section.id === id);
}
