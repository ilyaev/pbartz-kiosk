varying vec3 vUv;
uniform float t;
uniform vec2 u_resolution;
uniform float u_volume;
uniform float u_fade;
uniform float u_tempo;
uniform float u_mode;
uniform float u_beat_confidence;
uniform float u_beat;
uniform float u_beat_index;
uniform float u_beat_next_index;
uniform float u_beat_progress;

const float PI = 3.14159265359;
const float PI2 = 3.14159265359 * 2.;
const float MAX_CIRCLES = 16.;

float N21(vec2 p) {
    return fract(sin(p.x * 132.33 + p.y*1433.43) * 532.33 + sin(t)*.001);
}

mat2 rot2d(float a) {
    return mat2(vec2(sin(a), cos(a)), vec2(-cos(a), sin(a)));
}

void main() {
    vec2 uv = vUv.xy / u_resolution;
    uv.x *= u_resolution.x / u_resolution.y;

	vec3 col = vec3(0.0);
	vec3 main_color = vec3(.3,.9,.1);


	// float endX = N21(vec2(10., u_beat_next_index)) * .4;
	for(float i = 0. ; i < MAX_CIRCLES ; i+= 1.) {
		float start = N21(vec2(i, u_beat_index)) * .2;
		float end = N21(vec2(i, u_beat_next_index)) * .2;

		float startX = N21(vec2(10.+i, u_beat_index)) * .4;
		float n = N21(vec2(255.*(i + 1.), u_beat_index));

		vec2 center = vec2(0.);

		float range = .3*u_beat_confidence;

		if (n > .75) {
			center = mix(vec2(startX, -range), vec2(startX, range), u_beat_progress);
		} else if (n > .3) {
			center = mix(vec2(-range, startX), vec2(range, startX), u_beat_progress);
		} else {
			center = mix(vec2(-range, -range), vec2(range, range), u_beat_progress);
		}

		// float d = .001/abs(length(uv)-.05);

		float d = step(length(uv + center + vec2(u_volume*.05*u_beat_confidence, 0.)), mix(start, end, u_beat_progress));

		col = mix(col, d * main_color, .3);
	}


    gl_FragColor = vec4(col * u_fade, 1.);
}