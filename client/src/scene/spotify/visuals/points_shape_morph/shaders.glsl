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

    vec3 pointSphere = texture2D(shapesMap[1], gridUV).xyz;
    vec3 pointSphereSurface = texture2D(shapesMap[0], gridUV).xyz;
    vec3 pointCube = texture2D(shapesMap[2], gridUV).xyz;

    float n2 = n21(vec2(u_seed/3., u_seed*3.));

    float delta = sin(rmsSpeed)*.5 + .5*fract(n2*10.22);

    vec3 point = mix(pointSphere, pointCube, delta + sin(instanceId/(322. - n2*250.) + rmsSpeed*.9)*(.5 + 1.2*fract(n2*1320.22)));
    // vec3 point = mix(pointSphere, pointCube, 1.);

    vec3 coverColor = texture2D(cover1, gridUV).xyz;

    float range = 40.0 + rms*10. + 10. * kick + sin(fract(rmsSpeed*.7)*3.14)*5.; // 20. * kick + 10. * rms;
    float scale = 3.;

    float offsetX = point.r * range - range / 2.0;
    float offsetZ = point.b * range - range / 2.0;
    float offsetY = point.g * range - range / 2.0;

    // Wavy edges
    //float waveMax = 5.;
    //vec3 n = colorNoise(vec3(point.r, point.g, point.b) + rmsSpeed*.2, false);
    // vec3 smoothVal = smoothstep(0., .3, n) * smoothstep(0., .3, 1. - n); // corners also moves
    //vec3 smoothVal = smoothstep(0., .3, point) * smoothstep(0., .3, 1. - point); // corners fixed

    //offsetX += n.r * waveMax * smoothVal.b;
    //offsetY += n.g * waveMax * smoothVal.r;
    //offsetZ += n.b * waveMax * smoothVal.g;
    // End


    pixelColor = coverColor;

    // scale

    float subScale = pixelColor.r;

    if (mod(kickCount, 2.0) == 0.0) {
        subScale = pixelColor.r;
    } else if (mod(kickCount, 3.0) == .0) {
        subScale = pixelColor.g;
    } else {
        subScale = pixelColor.b;
    }
    // subScale = mix(0.5, subScale, kick);

    transformed *= scale * subScale;// + 1.*sin(instanceId/30. + iTime*3.);

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
