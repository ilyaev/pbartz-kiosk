#VERTEX

##HEADER

uniform float uGridSize;
uniform float uSpacing;
uniform sampler2D cover1;
uniform sampler2D cover2;
uniform sampler2D txPositions;
uniform sampler2D txSpherePositions;
uniform sampler2D shapesMap[4];
uniform sampler2D normalsMap[4];
uniform sampler2D noiseTexture;
uniform sampler2D noiseTexture2;
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


##BODY

    float instanceId = float(gl_InstanceID);
    float ix = mod(instanceId, uGridSize);
    float iz = floor(instanceId / uGridSize);

    vec2 gridUV = vec2(ix / (uGridSize - 1.0), iz / (uGridSize - 1.0));

    vec3 pointSphere = texture2D(shapesMap[1], gridUV).xyz;
    vec3 pointSphereNormal = texture2D(normalsMap[1], gridUV).xyz;
    vec3 pointSphereSurface = texture2D(shapesMap[0], gridUV).xyz;
    vec3 pointSphereSurfaceNormal = texture2D(normalsMap[0], gridUV).xyz;
    vec3 pointCube = texture2D(shapesMap[2], gridUV).xyz;
    vec3 pointCubeNormal = texture2D(normalsMap[2], gridUV).xyz;
    vec3 pointTorus = texture2D(shapesMap[3], gridUV).xyz;
    vec3 pointTorusNormal = texture2D(normalsMap[3], gridUV).xyz;


    vec3 pointsFrom = pointSphere;
    vec3 pointsTo = pointTorus;

    vec3 pointsFromNormal = pointSphereNormal;
    vec3 pointsToNormal = pointTorusNormal;

    // Select shape pairs based on kickCount (1,2,3,4, etc.)

    vec3 shapes[4];
    shapes[0] = pointSphere;
    shapes[1] = pointSphereSurface;
    shapes[2] = pointCube;
    shapes[3] = pointTorus;

    vec3 normals[4];
    normals[0] = pointSphereNormal;
    normals[1] = pointSphereSurfaceNormal;
    normals[2] = pointCubeNormal;
    normals[3] = pointTorusNormal;

    // Create array of all possible pairs of shapes (indices)
    ivec2 shapePairs[12];
    int idx = 0;
    for (int i = 0; i < 4; ++i) {
        for (int j = 0; j < 4; ++j) {
            if (i != j) {
                shapePairs[idx] = ivec2(i, j);
                idx++;
            }
        }
    }

    int pair = int(mod(kickCount, 12.0));
    int shapeA = shapePairs[pair].x;
    int shapeB = shapePairs[pair].y;

    pointsFrom = shapes[shapeA];
    pointsTo = shapes[shapeB];
    pointsFromNormal = normals[shapeA];
    pointsToNormal = normals[shapeB];

    float speed = rmsSpeed * 0.5;
    float noiseSpeed = iTime * (0.5);
    vec2 morphLag = .1 * abs(gridUV - texture2D(noiseTexture, gridUV).xy) - .05;

    vec3 circularNoise = texture2D(noiseTexture, vec2(.5 + morphLag) + vec2(sin(noiseSpeed)*.4, cos(noiseSpeed)*.4)).xyz;

    float pointsMix = .5 + circularNoise.r  - .5;

    vec3 point = mix(pointsFrom, pointsTo, pointsMix);

    point += (mix(pointsFromNormal, pointsToNormal, pointsMix) - 0.5 + sin(fract(speed) * 6.28318530718) * 0.2)
        * cos(gridUV.x / 10.0 + speed * 2.0 + gridUV.y * 10.0 + instanceId / 1430.0 * 0.0)
        * (2.5 - 0. * 20.0);

    vec3 noisePoint = texture2D(noiseTexture, gridUV).xyz;



    vec3 coverColor = texture2D(cover1, gridUV + speed*0.).xyz;

    float range = 35.0 - kick*30.;
    float scale = 3. - kick * 2.9;

    float offsetX = point.r * range - range / 2.0;
    float offsetZ = point.b * range - range / 2.0;
    float offsetY = point.g * range - range / 2.0;

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

    transformed *= (scale * subScale) * (1. - kick);

    transformed *= circularNoise.b * 2.;

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
