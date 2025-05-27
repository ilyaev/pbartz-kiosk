#VERTEX

##HEADER

uniform float uGridSize;
uniform float uSpacing;
uniform sampler2D cover1;
uniform sampler2D cover2;
uniform sampler2D txPositions;
uniform sampler2D txSpherePositions;
uniform sampler2D shapesMap[3];
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

float n21(vec2 p) {
    return fract(sin(p.x*123.231 + p.y*4432.342)*33344.22);
}

##BODY

    float instanceId = float(gl_InstanceID);
    float ix = mod(instanceId, uGridSize);
    float iz = floor(instanceId / uGridSize);

    vec2 gridUV = vec2(ix / (uGridSize - 1.0), iz / (uGridSize - 1.0));

    int currentShape = int(floor(n21(vec2(floor(iTime), 1.23)) * 3.));
    int nextShape = int(floor(n21(vec2(floor(iTime + 1.0), 1.23)) * 3.));
    float delta = fract(iTime);

    vec3 pointSphere;
    if (currentShape == 0) {
        pointSphere = texture2D(shapesMap[0], gridUV).xyz;
    } else if (currentShape == 1) {
        pointSphere = texture2D(shapesMap[1], gridUV).xyz;
    } else {
        pointSphere = texture2D(shapesMap[2], gridUV).xyz;
    }

    vec3 pointCube;
    if (nextShape == 0) {
        pointCube = texture2D(shapesMap[0], gridUV).xyz;
    } else if (nextShape == 1) {
        pointCube = texture2D(shapesMap[1], gridUV).xyz;
    } else {
        pointCube = texture2D(shapesMap[2], gridUV).xyz;
    }

    // vec3 point = mix(pointSphere, pointCube, sin(iTime * 1.5 + sin(instanceId)*1.3) * 0.5 + .5);
    // float morphValue = sin(iTime * 1.5 + sin(instanceId) * 1.3) * 0.5 + 0.5;

    // float morphValue = sin(iTime*2.) * 0.5 + .5;
    float morphValue = sin(delta*3.14/2. + sin(instanceId)*1.3)*.5 + .5;

    vec3 point = mix(pointSphere, pointCube, morphValue);

    vec3 coverColor = texture2D(cover1, gridUV).xyz;

    float range = 40.0 + sin(iTime * 3.5) * 2.0;
    float scale = 1.;

    float offsetX = point.r * range - range / 2.0;
    float offsetZ = point.b * range - range / 2.0;
    float offsetY = point.g * range - range / 2.0;

    // Wavy edges
    float waveMax = 5.;
    vec3 n = colorNoise(vec3(point.r, point.g, point.b) + iTime*.3, false);
    // vec3 smoothVal = smoothstep(0., .3, n) * smoothstep(0., .3, 1. - n); // corners also moves
    vec3 smoothVal = smoothstep(0., .3, point) * smoothstep(0., .3, 1. - point); // corners fixed

    // offsetX += n.r * waveMax * smoothVal.b;
    // offsetY += n.g * waveMax * smoothVal.r;
    // offsetZ += n.b * waveMax * smoothVal.g;
    // End


    pixelColor = coverColor;

    // scale

    transformed *= scale * pixelColor.r;

    // translate instances
    vec3 instanceOffset = vec3(offsetX, offsetY, offsetZ);
    transformed += instanceOffset;

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
