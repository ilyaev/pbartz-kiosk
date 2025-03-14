attribute float x;
attribute float y;
attribute float height;

varying float vX;
varying float vY;
varying float vHeight;
varying vec3 vNormal;
varying vec2 vUv;
uniform vec2 grid;
varying vec3 vColor;

uniform float iTime;
uniform float bars[7];
uniform vec2 center;

void main() {
    vX = x;
    vY = y;

    vec3 pos = position;
    // pos.z *= 1. + sin(iTime);


    vec4 transformedPosition = instanceMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * transformedPosition;

    vNormal = normal;// normalMatrix * (instanceMatrix * vec4(normal, 0.0)).xyz;
    vUv = uv;
    vHeight = height;

    // Face color

    vec3 baseColor = vec3(.9, .3, .1);
    float d = distance(vec3(vX, vY, 0.), vec3(center, 1.3 + max(0.,bars[6])*2.));

    // if (d > grid.x/2.) {
    //     vColor = vec3(0.);
    // } else {
        float light = (5.)/pow(d, 1.5);

        vColor = vec3(min(baseColor * light, baseColor*5.));

        float magnitude = 0.08;
        float power = .2;

        if (abs(vNormal.y) > 0.) {
            vColor.rgb *= d*.2;
        }
        if (abs(vNormal.x) > 0.) {
            vColor.rgb *= d*.4;
        }
        if (height < 1.) {
            vColor *= (.8 - d/15.);
        }


    // }
}