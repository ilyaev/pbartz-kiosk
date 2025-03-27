varying vec3 vUv;
uniform vec2 u_resolution;
uniform float u_radius;
uniform float iTime;
uniform float bars[32]; // Define bars as uniform array of 7 floats

void main() {
    vec2 uv = vUv.xy/4.;
    // vec2 uv = (fragCoord-.5*iResolution.xy)/iResolution.y;


    // uv = fract(uv * vec2(8., 40.)) - .5;

    uv.x *= u_resolution.x / u_resolution.y;

    vec3 col = vec3(0.);


    // col.r = abs(uv.x);
    // col.g = abs(uv.y);

    for (int i = 0; i < 32; i++) {
        float barValue = bars[i];//min(.6, max(bars[i], -.6));
        float barHeight = abs(barValue) * .8;

        // barHeight = floor(barHeight * 30.0) / 30.0;

        float barWidth = 0.02 +  abs(barValue)*.05 + u_radius*.3;
        vec2 barPos = vec2(float(i) * 0.04 - 0.6, barHeight*(1.1 + u_radius) - .22);

        if (uv.x > barPos.x - barWidth / 1.1 && uv.x < barPos.x + barWidth / 1.1 &&
            uv.y > barPos.y - barHeight && uv.y < barPos.y + barHeight) {
            // col += vec3(1.0-pow(barHeight,2.), .02/pow(barHeight,1.8), barHeight); // v1
            col += vec3(1.0-.015/pow(barHeight,.85), .02/pow(barHeight,1.8), barHeight); // v1
        }
    }



    // col /= 7.;



    gl_FragColor = vec4(col, 1.);
}

// for (int i = 0; i < 7; i++) {
//         float barValue = bars[i] + 1.;
//         col += vec3(barValue/2., cos(float(i))*u_radius, u_radius) * (1. - step(barValue, length(uv)));
//     }