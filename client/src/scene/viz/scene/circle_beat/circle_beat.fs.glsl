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
uniform float u_beat_next;

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
	// uv.x += (u_beat_confidence-.5)*.3;

	vec3 col = vec3(0.0);
	vec3 main_color = vec3(.3,.9,.1);

	for(float i = 0. ; i < MAX_CIRCLES ; i+= 1.) {
		float amp = u_beat_confidence*2.;
		float currentX = N21(vec2(i+1., u_beat_index))*amp;
		float nextX = N21(vec2(i+1., u_beat_index + 1.))*amp;

		float currentY = N21(vec2(i*100.+1., u_beat_index))*amp;
		float nextY = N21(vec2(i*100.+1., u_beat_index + 1.))*amp;

		main_color.g = currentY + .5*sin(u_beat_index);
		main_color.r = currentX + .5*cos(u_beat_index);
		main_color.b = (currentX + currentY);

		// main_color = (.02+sin(t*u_beat_confidence)*.02)/main_color*2.;

		float beat_progress = (t - u_beat)/(u_beat_next-u_beat);

		float x = mix(currentX, nextX, beat_progress)*2.;
		float y = mix(currentY, nextY, beat_progress)*2.;

		vec2 shift = vec2((x - .5)*.1, (y - .5)*.1);

		// vec2 shift = vec2(sin(i*(PI2/MAX_CIRCLES)), cos(i*(PI2/MAX_CIRCLES)))*(.2 + sin(i + t*5.*u_beat_confidence)*.1);

		uv += shift *.1;

		uv *= rot2d(t*.1*u_beat_confidence);

		float d = step(length(uv + shift), .1 + u_beat_confidence*.03 + (u_volume*.01) - .01 * i);

		col = max(col, mix(col, d * main_color, .5));
	}


    gl_FragColor = vec4(col * u_fade, 1.);
}