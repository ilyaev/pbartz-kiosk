#VERTEX

##HEADER

uniform float uGridSize;
uniform float uSpacing;
uniform sampler2D cover1;
uniform sampler2D cover2;
uniform float iTime;
uniform float rms;
uniform float allrms;
uniform float kick;
uniform float kickCount;
varying vec3 vInstancePosition;
varying vec2 vGridUV;
varying vec3 pixelColor;
uniform float bars[7];
uniform float rmsSpeed;
uniform vec3 cameraPos;
varying float distanceToCamera;

#include <noise3d>

##BODY

    float instanceId = float(gl_InstanceID);
    float ix = mod(instanceId, uGridSize);
    float iz = floor(instanceId / uGridSize);

    vec2 gridUV = vec2(ix / (uGridSize - 1.0), iz / (uGridSize - 1.0));

    vec3 pointNoise = colorNoise(
        vec3(
            gridUV + vec2(rmsSpeed * .15 + ix*kick, 0. + ix/iz*.1),
            rmsSpeed * 0.3
        ),
        false
    );

    float range = 40.0 + 100.0 * rms + 10.*kick;

    float offsetX = pointNoise.r * range - range / 2.0;
    float offsetZ = pointNoise.b * range - range / 2.0;
    float offsetY = pointNoise.g * range - range / 2.0;


    vec3 texColor = texture2D(cover1, gridUV).rgb;
    vec3 texColor2 = texture2D(cover2, gridUV).rgb;

    float kickDirection = 1.;

    if (mod(kickCount, 2.0) == 0.0) {
        kickDirection = -1.;
        pixelColor = mix(texColor2, texColor, kick);
    } else {
        kickDirection = 1.;
        pixelColor = mix(texColor, texColor2, kick);
    }


    float scale = pixelColor.r;
    if (mod(kickCount, 2.0) == 0.0) {
        scale = pixelColor.g;
    } else if (mod(kickCount,3.0) == 1.0) {
        scale = pixelColor.b;
    } else {
        scale = pixelColor.r;
    }
    transformed *= scale*2.;

    // translate instances
    vec3 instanceOffset = vec3(offsetX, offsetY, offsetZ);

    // inflate
    vec3 toCenter = instanceOffset - vec3(0., 0.0, 0.0);
    instanceOffset += normalize(toCenter) * pixelColor.r*2.;

    transformed += instanceOffset;

    // distanceToCamera = length(cameraPos - transformed);

    vInstancePosition = instanceOffset;
    vGridUV = gridUV;


#FRAGMENT

##HEADER

uniform float uGridSize;
uniform float uSpacing;
uniform sampler2D cover1;
uniform sampler2D cover2;
uniform float iTime;
uniform float kick;
uniform float kickCount;
varying vec3 vInstancePosition;
varying vec2 vGridUV;
varying vec3 pixelColor;
varying float distanceToCamera;

##BODY

    vec3 col = pixelColor;


    vec4 diffuseColor = vec4(col, 1.);
