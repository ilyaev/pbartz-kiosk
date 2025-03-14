interface RgbColor {
  r: number;
  g: number;
  b: number;
}

interface HslColor {
  h: number;
  s: number;
  l: number;
}

export function increaseContrast(
  foregroundColor: string,
  backgroundColor: string
): string {
  // Helper functions
  function parseColorToRgb(color: string): RgbColor {
    if (color.startsWith("#")) {
      let hex = color.slice(1);
      if (hex.length === 3) {
        hex = hex
          .split("")
          .map((c) => c + c)
          .join("");
      }
      return {
        r: parseInt(hex.substr(0, 2), 16),
        g: parseInt(hex.substr(2, 2), 16),
        b: parseInt(hex.substr(4, 2), 16),
      };
    } else if (color.startsWith("rgb")) {
      const parts = color.match(/(\d+)/g)!.map(Number); // Non-null assertion here
      return { r: parts[0], g: parts[1], b: parts[2] };
    }
    return { r: 0, g: 0, b: 0 };
  }

  function rgbToHsl(r: number, g: number, b: number): HslColor {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h: number = 0;
    let s: number = 0;
    const l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  function hslToRgb(h: number, s: number, l: number): RgbColor {
    h /= 360;
    s /= 100;
    l /= 100;
    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number): number => {
        let tempT = t;
        if (tempT < 0) tempT += 1;
        if (tempT > 1) tempT -= 1;
        if (tempT < 1 / 6) return p + (q - p) * 6 * tempT;
        if (tempT < 1 / 2) return q;
        if (tempT < 2 / 3) return p + (q - p) * (2 / 3 - tempT) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  }

  function calculateLuminance(r: number, g: number, b: number): number {
    const srgb = [r, g, b].map((c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  }

  function getContrast(lum1: number, lum2: number): number {
    return lum1 > lum2
      ? (lum1 + 0.05) / (lum2 + 0.05)
      : (lum2 + 0.05) / (lum1 + 0.05);
  }

  function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (c: number): string => ("0" + c.toString(16)).slice(-2);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  // Main logic
  const fgRgb = parseColorToRgb(foregroundColor);
  const bgRgb = parseColorToRgb(backgroundColor);

  const fgLum = calculateLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const bgLum = calculateLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

  const shouldDarken = fgLum < bgLum;
  const fgHsl = rgbToHsl(fgRgb.r, fgRgb.g, fgRgb.b);

  const bestHsl: HslColor = { ...fgHsl };
  let bestContrast = getContrast(fgLum, bgLum);
  const step = 1; // 1% lightness change per step

  for (let i = 0; i < 100; i++) {
    const newL = shouldDarken ? bestHsl.l - step : bestHsl.l + step;
    if (newL < 0 || newL > 85) break;

    const newRgb = hslToRgb(bestHsl.h, bestHsl.s, newL);
    const newLum = calculateLuminance(newRgb.r, newRgb.g, newRgb.b);
    const newContrast = getContrast(newLum, bgLum);

    if (newContrast > bestContrast) {
      bestContrast = newContrast;
      bestHsl.l = newL;
    } else {
      break;
    }
  }

  const newRgb = hslToRgb(bestHsl.h, bestHsl.s, bestHsl.l);
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
}

export const getPrimarySecondaryForBackground = (
  background: string,
  primary: string,
  secondary: string
) => {
  const primaryContrast = contrastRatio(background, primary);
  const secondaryContrast = contrastRatio(background, secondary);

  return {
    primary:
      primaryContrast > 3 ? primary : increaseContrast(primary, background),
    secondary:
      secondaryContrast > 3 ? secondary : increaseContrast(primary, background),
  };
};

export function hexToRgb(
  hex: string
): { r: number; g: number; b: number } | null {
  // Remove the hash (#) if it exists
  hex = hex.replace("#", "");

  // Handle shorthand hex color codes (e.g., #abc)
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  if (hex.length !== 6) {
    return null; // Invalid hex code
  }

  // Parse the hex values for red, green, and blue
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return null; // Invalid hex code (non-hex characters)
  }

  return { r: r, g: g, b: b };
}

export function relativeLuminance(hexColor: string) {
  const rgb = hexToRgb(hexColor);
  if (!rgb) {
    return 0;
  }
  const { r, g, b } = rgb;

  const rsrgb = r / 255;
  const gsrgb = g / 255;
  const bsrgb = b / 255;

  const rLin =
    rsrgb <= 0.03928 ? rsrgb / 12.92 : ((rsrgb + 0.055) / 1.055) ** 2.4;
  const gLin =
    gsrgb <= 0.03928 ? gsrgb / 12.92 : ((gsrgb + 0.055) / 1.055) ** 2.4;
  const bLin =
    bsrgb <= 0.03928 ? bsrgb / 12.92 : ((bsrgb + 0.055) / 1.055) ** 2.4;

  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

export function contrastRatio(hexColor1: string, hexColor2: string): number {
  const l1 = relativeLuminance(hexColor1);
  const l2 = relativeLuminance(hexColor2);

  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (brighter + 0.05) / (darker + 0.05);
}
