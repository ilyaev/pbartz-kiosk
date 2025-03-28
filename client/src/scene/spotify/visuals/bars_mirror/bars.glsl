varying vec3 vUv;
uniform vec2 u_resolution;
uniform float u_radius;
uniform float iTime;
uniform float bars[32]; // Define bars as uniform array of 7 floats

void main() {
    vec2 uv = vUv.xy/4.;

    uv.x *= u_resolution.x / u_resolution.y;

    if (uv.y < -0.218) {
        uv.x += sin(uv.y*10. + iTime)*.005 + sin(uv.y*20. - iTime)*.005;
        uv.x += sin(uv.y) + .216;
        // uv.x += sin(uv.y / 2.) + .108;
        // uv.x += sin(uv.y/4.) + .0496;
    }

    vec3 col = vec3(0.);


    for (int i = 0; i < 32; i++) {
        float barValue = bars[i];
        float barHeight = abs(barValue) * .8;

        float barWidth = 0.02 +  abs(barValue)*.05 + u_radius*.3;
        if (uv.y < -0.218) {
            barWidth = 0.02;//-= abs(uv.y + 0.218)*.3;
        }

        barWidth /= 1.1;

        vec2 barPos = vec2(float(i) * 0.04 - 0.6, barHeight/1.8 - .22);

        if (uv.x > barPos.x - barWidth && uv.x < barPos.x + barWidth &&
            uv.y > barPos.y - barHeight && uv.y < barPos.y + barHeight) {
            col += max(col, vec3(1.0-pow(barHeight,2.), .02/pow(barHeight,1.8), barHeight)); // v1
            col *= vec3(1.0-.015/pow(barHeight,.85), .02/pow(barHeight,1.8), barHeight);
        }
    }

    // col = vec3(.9, .3, .1);

    float line = (.1)/pow(abs(uv.y + .22), 1.2);

    gl_FragColor = vec4(col*line, 1.);
}
