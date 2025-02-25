varying vec3 vUv;
uniform vec2 u_resolution;
uniform float u_radius;
uniform float iTime;
uniform float bars[7]; // Define bars as uniform array of 7 floats

void main() {
    vec2 uv = vUv.xy/4.;
    // vec2 uv = (fragCoord-.5*iResolution.xy)/iResolution.y;


    // uv = fract(uv * vec2(8., 40.)) - .5;

    uv.x *= u_resolution.x / u_resolution.y;

    vec3 col = vec3(0.);


    // col.r = abs(uv.x);
    // col.g = abs(uv.y);

    for (int i = 0; i < 7; i++) {
        float barValue = min(.6, max(bars[i], -.6));
        float barHeight = abs(barValue) * 1.;
        float barWidth = 0.05 + sin(uv.y*13.*barValue + iTime*3.*u_radius + float(i)/2.) * 0.01 + abs(barValue)*.1;
        vec2 barPos = vec2(float(i) * 0.2 - 0.6, 0.);

        if (uv.x > barPos.x - barWidth / 1.1 && uv.x < barPos.x + barWidth / 1.1 &&
            uv.y > barPos.y - barHeight / 1.1 && uv.y < barPos.y + barHeight / 1.1) {
            col += vec3(1.0, barValue * -1., 0.0); // Red color for the bars
        }
    }



    // col /= 7.;

    gl_FragColor = vec4(col, 1.);
}

// for (int i = 0; i < 7; i++) {
//         float barValue = bars[i] + 1.;
//         col += vec3(barValue/2., cos(float(i))*u_radius, u_radius) * (1. - step(barValue, length(uv)));
//     }