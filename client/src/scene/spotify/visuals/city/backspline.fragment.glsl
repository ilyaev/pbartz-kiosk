varying float vX;
varying float vY;
varying vec2 vUv;
varying float vHeight;
varying vec3 vNormal;
uniform vec2 grid;
uniform float iTime;
uniform float bars[7];
uniform float rms;

float u_numBars = 7.;

vec3 u_lineColor = vec3(1.0, 1.0, 1.0);

void main() {
    vec2 uv = vUv - vec2(.42, .53 + .01*rms - .005);
    float x = uv.x * grid.x;
    float y = uv.y * grid.y;

    float u_lineWidth = 0.012 - rms *.01 - .005;

    float barWidth = 2.0 / u_numBars;
    float smoothLine = 0.0;

    float sineForce = .005 * rms;

    vec3 segmentColor = vec3(.9, .3, .1);

    for (int i = 0; i < 7; i++) {
        float barPosition = float(i) * barWidth;
        float distance = abs(x - barPosition);
        float weight = exp(-distance * distance / ((200.0 - 50.*rms) * u_lineWidth * u_lineWidth));
        smoothLine += (bars[i]*.008 + sin(iTime*10. + float(i)*11.2)*sineForce + cos(iTime*6. + float(i)*5.2)*sineForce*.7) * weight;

        // Calculate segment color as gradient between red and green based on bars[i]
        segmentColor += mix(vec3(0.1, 0.9, 0.1), vec3(0.9, 0.3, 0.1),bars[i]*3.);
    }

    segmentColor /= 7.;

    smoothLine = smoothLine / (sqrt(1. * 3.14159) * u_lineWidth);

    vec3 color = (.01 + rms*.1)/pow(abs(y - smoothLine), .8) * segmentColor;
    gl_FragColor = vec4(color, 1.0);

}