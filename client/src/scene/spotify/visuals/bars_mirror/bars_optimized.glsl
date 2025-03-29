precision mediump float; // Use medium precision for potentially better performance

varying vec3 vUv;
uniform vec2 u_resolution;
uniform float u_radius;
uniform float iTime;
uniform float bars[32];

// --- Precomputed Constants ---
const float UV_SCALE = 0.25; // 1.0 / 4.0
const float Y_THRESHOLD = -0.218;
const float BAR_Y_OFFSET = -0.22;
const float BAR_X_OFFSET = -0.6;
const float BAR_X_SPACING = 0.04;
const float BAR_HEIGHT_SCALE = 0.8;
const float BAR_HEIGHT_Y_FACTOR = 0.55555; // 1.0 / 1.8
const float BAR_WIDTH_BASE = 0.02;
const float BAR_WIDTH_VALUE_SCALE = 0.05;
const float BAR_WIDTH_RADIUS_SCALE = 0.3;
const float BAR_WIDTH_DIVISOR = 1.1;
const float LINE_Y_OFFSET = 0.22;
const float LINE_INTENSITY = 0.1;
const float EPS = 0.0001; // Small epsilon to avoid division by zero

void main() {
    // --- UV Calculation & Aspect Ratio Correction ---
    vec2 uv = vUv.xy * UV_SCALE;
    uv.x *= u_resolution.x / u_resolution.y;

    // --- Conditional Distortion (Pre-Loop) ---
    // Calculate this once, before the loop.
    bool isBelowThreshold = uv.y < Y_THRESHOLD;
    if (isBelowThreshold) {
        uv.x += sin(uv.y * 10. + iTime) * 0.005 + sin(uv.y * 20. - iTime) * 0.005;
        uv.x += sin(uv.y) + 0.216; // Original offset
        // uv.x += sin(uv.y / 2.) + .108; // Commented out in original
        // uv.x += sin(uv.y / 4.) + .0496; // Commented out in original
    }

    // --- Line Calculation (Pre-Loop) ---
    // Calculate the horizontal line effect once.
    // Added EPS to avoid potential division by zero or pow(0, non_integer) issues.
    float absYTerm = abs(uv.y + LINE_Y_OFFSET) + EPS;
    float line = LINE_INTENSITY / pow(absYTerm, 1.2);

    // --- Bar Rendering Loop ---
    vec3 col = vec3(0.0); // Use mediump vec3

    for (int i = 0; i < 32; i++) {
        // --- Per-Bar Calculations ---
        float barValue = bars[i];
        float barHeight = barValue * BAR_HEIGHT_SCALE;

        // Optimized barWidth calculation
        float barWidth;
        if (isBelowThreshold) {
            // Use precomputed flag instead of checking uv.y again
            barWidth = BAR_WIDTH_BASE;
        } else {
            barWidth = BAR_WIDTH_BASE + barValue * BAR_WIDTH_VALUE_SCALE + u_radius * BAR_WIDTH_RADIUS_SCALE;
        }
        barWidth /= BAR_WIDTH_DIVISOR; // Apply division after conditional logic

        // Avoid redundant calculations for barPos
        float barPosX = float(i) * BAR_X_SPACING + BAR_X_OFFSET;
        float barPosY = barHeight * BAR_HEIGHT_Y_FACTOR + BAR_Y_OFFSET; // Applied scale here

        // Simplified bar extent calculations
        float halfWidth = barWidth; // Assuming barWidth is actually half-width based on usage
        float halfHeight = barHeight; // Assuming barHeight is half-height

        // --- Collision Check ---
        // Check Y first potentially? Might offer minor culling improvement.
        if (uv.y > barPosY - halfHeight && uv.y < barPosY + halfHeight &&
            uv.x > barPosX - halfWidth && uv.x < barPosX + halfWidth)
        {
            // --- Color Calculation (Optimized) ---
            // Add EPS to barHeight in denominators to prevent division by zero.
            float bh = barHeight + EPS; // Use epsilon-adjusted height for safe division/pow
            float bhSq = bh * bh; // Replace pow(bh, 2.0) with multiplication
            float invPowBh18 = 0.02 / pow(bh, 1.8); // Keep pow for non-integer, but use bh

            // Option 1: Keep original logic (+= max followed by *=)
            // This blending mode is complex and potentially slow if many bars overlap.
            // vec3 currentBarColBase = vec3(1.0 - bhSq, invPowBh18, bh);
            // col += max(vec3(0.0), currentBarColBase - col); // Equivalent to col = max(col, currentBarColBase) if col starts at 0
            // col *= vec3(1.0 - 0.015 / pow(bh, 0.85), invPowBh18, bh); // Keep pow for non-integer

            // Option 2: More standard/potentially faster blend (Calculate final bar color, then max)
            // This might look slightly different if bars overlap significantly.
            vec3 barColor = vec3(1.0 - bhSq, invPowBh18, bh);
            // Apply the second multiplication directly to the bar's color *before* max blending
            barColor *= vec3(1.0 - 0.015 / pow(bh, 0.85), invPowBh18, bh);
            col = max(col, barColor); // Blend using max

            // If only one bar is expected to hit a pixel, this could be even simpler:
            // col = barColor; // Overwrite instead of blending
        }
    }

    // --- Final Color Output ---
    gl_FragColor = vec4(col * line, 1.0);
}