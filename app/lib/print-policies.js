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
      'Prints are offered in seven sizes, from Small (8×12″) through Museum, all in a 2:3 aspect ratio. The print area is the same whether you choose a mat border or full bleed — only the outer frame size changes.',
      'Border adds a white mat around the image; full bleed extends the image to the inside edge of the frame. The table below lists each size with framed and unframed options, mount style, mat width, moulding width, and outer dimensions. Black and white frames share the same measurements.',
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
