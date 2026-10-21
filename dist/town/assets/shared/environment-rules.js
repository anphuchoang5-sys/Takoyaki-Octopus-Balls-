// Shared opening rule; each asset retains its own final lighting/art values.
export const nightStrength = time => time==='night'?1:time==='dusk'?.45:0;
