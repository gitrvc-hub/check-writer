// Unit conversions shared by the preview and the PDF renderer.

export const MM_PER_INCH = 25.4;
export const PT_PER_INCH = 72;
export const PT_PER_MM = PT_PER_INCH / MM_PER_INCH; // ~2.8346 pt per mm
export const MM_PER_PT = MM_PER_INCH / PT_PER_INCH; // ~0.3528 mm per pt

/** Physical height of one typographic point, in millimetres (for font sizing). */
export const PT_TO_MM_FONT = MM_PER_PT;

/** Screen pixels per millimetre used by the on-screen cheque preview. */
export const PREVIEW_PX_PER_MM = 3.4;
