varying vec3 vUv;
uniform float t;
uniform vec2 u_resolution;
uniform float u_volume;
uniform float u_fade;
uniform float u_tempo;
uniform float u_mode;
uniform float u_beat_confidence;
uniform float u_beat;

const float PI = 3.14159265359;
const float PI2 = 3.14159265359 * 2.;
const float NUM_SQUARES = 16.;


void main() {
    vec2 uv = vUv.xy / u_resolution;
    // uv.y += 0.45;
    uv.x += 6.;
    uv.x *= u_resolution.x / u_resolution.y;

	vec3 col = vec3(1.0);
	vec3 wave_color = vec3(.3,.9,.1);

	float A = (0.1 + u_beat_confidence*.2) * u_volume;
	float P = 4.*u_volume;
	float wave = abs(.001/(uv.y + A*sin(uv.x*P)));

	float wave2 = abs(.001/(uv.y + A*sin(uv.x*P*2.)));

	wave = max(wave, wave2);

	col = wave * wave_color;

    gl_FragColor = vec4(col * u_fade, 1.);
}