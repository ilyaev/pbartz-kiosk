#VERTEX

##HEADER

uniform float uGridSize;
uniform float uSpacing;
uniform sampler2D cover1;
uniform sampler2D cover2;
uniform sampler2D canvas;
uniform float iTime;
uniform float rms;
uniform float allrms;
uniform float kick;
uniform float kickCount;
varying vec3 vInstancePosition;
varying vec2 vGridUV;
varying float spectreHeight;
varying vec3 spectreColor;
varying vec3 pixelColor;
uniform float bars[7];
uniform float rmsSpeed;


 mat2 rotate2d(float angle) {
    return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
}

##BODY

    float instanceId = float(gl_InstanceID);
    float ix = mod(instanceId, uGridSize);
    float iz = floor(instanceId / uGridSize);

    float offsetX = (ix - uGridSize / 2.0 + 0.5) * (uSpacing + kick *.02);
    float offsetZ = (iz - uGridSize / 2.0 + 0.5) * (uSpacing + kick *.02);

    vec2 gridUV = vec2(ix / (uGridSize - 1.0), iz / (uGridSize - 1.0));
    vec3 texColor = texture2D(cover1, gridUV).rgb;
    vec3 texColor2 = texture2D(cover2, gridUV).rgb;
    vec3 texCanvas = texture2D(canvas, gridUV).rgb;

    float kickDirection = 1.;

    // basic vertical offset
    float offsetY1 = - texColor.b * 3.0;
    float offsetY2 = - texColor2.b * 3.0;
    float offsetY = 0.;

    float noiseMaxHeight = 10.5;

    if (mod(kickCount, 2.0) == 0.0) {
        kickDirection = -1.;
        offsetY = mix(offsetY1, offsetY2, kick);
    } else {
        kickDirection = 1.;
        offsetY = mix(offsetY2, offsetY1, kick);
    }

    float height = offsetY;

    float specterWave = 0.;
    float axisShift = 0.;

    // displacement
    if (gridUV.y <= .5) {
        specterWave = texture2D(canvas, vec2(gridUV.x, 1. - (gridUV.y - .01)*2.)).r;
    } else {
        specterWave = texture2D(canvas, vec2(gridUV.x, (gridUV.y - .49)*2.)).r;
    }

    spectreHeight = specterWave;
    offsetY -= specterWave * 10.;


    vec3 nColor = vec3(1.);

    pixelColor = nColor;
    offsetY += nColor.r * noiseMaxHeight;

    spectreColor = max(vec3(.1,-.5, -.5), sin(vec3(.3, .9, .1) + vec3(iTime, iTime/2., iTime*2.)) + cos(vec3(.9, .3, .1) + iTime*2.));

    // scale instances
    float scale = (2. + (sin(iTime)*.5 + .5)*2.) * max(.1, pixelColor.r*.7) ;
    transformed *= scale;

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
varying float spectreHeight;
varying vec3 spectreColor;
varying vec3 pixelColor;

##BODY

    vec3 texColor = texture2D(cover1, vGridUV).rgb * 1.5;
    vec3 texColor2 = texture2D(cover2, vGridUV).rgb * 1.5;
    vec3 color = vec3(0.);
    if (mod(kickCount, 2.0) == 0.0) {
        color = mix(texColor, texColor2, kick);
    } else {
        color = mix(texColor2, texColor, kick);
    }
    vec4 diffuseColor = vec4(color * pixelColor, opacity);
