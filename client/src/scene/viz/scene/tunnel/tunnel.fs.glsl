varying vec3 vUv;
uniform float t;
uniform float rad;
uniform vec2 u_resolution;
uniform int u_circles; // 12
uniform float u_size;  // 0.04
uniform float u_volume;

const float PI = 3.14159265359;
const float NUM_SQUARES = 16.;

mat2 rotate2d(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
}

float getRect(vec2 uv, float size, float scale) {
    float d = distance(uv, vec2(clamp(-size, size, uv.x), clamp(-size,size, uv.y)));
    return step(0.001 * scale, d) - step(0.005 * scale,d);
}

float getDot(vec2 uv, vec2 center) {
    return .012/distance(uv, center)/10.;
}

float getBorder(vec2 uv, float size) {
    float col = 0.;
    col += getDot(uv, vec2(size));
    col += getDot(uv, vec2(-size));
    col += getDot(uv, vec2(size,-size));
    col += getDot(uv, vec2(-size,size));
    return col;
}




void main() {
    vec2 uv = vUv.xy / u_resolution;
    uv.x *= u_resolution.x / u_resolution.y;

   vec2 mouse = vec2(.5);
   vec3 col = vec3(0.);

   float iTime = t;

    for(float i = 0. ; i < 1. ; i += 1./NUM_SQUARES) {
        float shift = fract(iTime*6.)/NUM_SQUARES;
        float scale = mix(.1, 1., i - shift);
        float fade = 1. - float(i)+u_volume*.1;
        vec2 nuv = uv * scale * rotate2d((i - shift) * (mouse.x * 6.28));
        float color = getRect(nuv, 0.1, scale) * fade;
        col += color * sin(vec3(0.9, 0.1, 0.9) + i*3.14);
        vec3 borderColor = sin(vec3(0.9,0.3,0.9) + i*3.14 + iTime) + 0.5;
        col += borderColor * getBorder(nuv, 0.1+min(.1, (u_volume*.1 - .05))) * fade;
    }

    gl_FragColor = vec4(col, 1.0);
}