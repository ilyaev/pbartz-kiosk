#VERTEX
// =====================
// Vertex Shader Header
// =====================
##HEADER
// Uniforms for controlling grid, spacing, and textures
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
uniform vec2 shapePairs[12];
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

// =====================
// Vertex Shader Body
// =====================
##BODY
    // Calculate instance index in grid
    float instanceId = float(gl_InstanceID);
    float ix = mod(instanceId, uGridSize);
    float iz = floor(instanceId / uGridSize);

    // Normalized grid coordinates (UV)
    vec2 gridUV = vec2(ix / (uGridSize - 1.0), iz / (uGridSize - 1.0));

    // Sample shape and normal data from textures
    vec3 pointSphere = texture2D(shapesMap[1], gridUV).xyz;
    vec3 pointSphereNormal = texture2D(normalsMap[1], gridUV).xyz;
    vec3 pointSphereSurface = texture2D(shapesMap[0], gridUV).xyz;
    vec3 pointSphereSurfaceNormal = texture2D(normalsMap[0], gridUV).xyz;
    vec3 pointCube = texture2D(shapesMap[2], gridUV).xyz;
    vec3 pointCubeNormal = texture2D(normalsMap[2], gridUV).xyz;
    vec3 pointTorus = texture2D(shapesMap[3], gridUV).xyz;
    vec3 pointTorusNormal = texture2D(normalsMap[3], gridUV).xyz;

    // Default morphing shapes
    vec3 pointsFrom = pointSphere;
    vec3 pointsTo = pointTorus;

    vec3 pointsFromNormal = pointSphereNormal;
    vec3 pointsToNormal = pointTorusNormal;

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

    // Choose which shapes to morph between using shapePairs and kickCount
    int pair = int(mod(kickCount, 12.0));
    int shapeA = int(shapePairs[pair].x);
    int shapeB = int(shapePairs[pair].y);

    pointsFrom = shapes[shapeA];
    pointsTo = shapes[shapeB];
    pointsFromNormal = normals[shapeA];
    pointsToNormal = normals[shapeB];

    // Animation and morphing parameters
    float speed = rmsSpeed * 0.5;
    float noiseSpeed = iTime * (0.2);
    vec2 morphLag = .1 * abs(gridUV - texture2D(noiseTexture, gridUV).xy) - .05;

    // Circular noise for morphing
    vec3 circularNoise = texture2D(noiseTexture, vec2(.5 + morphLag) + vec2(sin(noiseSpeed)*.4, cos(noiseSpeed)*.4)).xyz;

    // Morphing factor between shapes
    float pointsMix = .5 + circularNoise.r  - .5;

    // Interpolate between selected shapes
    vec3 point = mix(pointsFrom, pointsTo, pointsMix);

    // Add normal-based displacement and animation
    point += (mix(pointsFromNormal, pointsToNormal, pointsMix) - 0.5 + sin(fract(speed) * 6.28318530718) * 0.2)
        * cos(gridUV.x / 10.0 + speed * 2.0 + gridUV.y * 10.0 + instanceId / 1430.0 * 0.0)
        * (2.5 - 0. * 20.0);

    // Sample additional noise
    vec3 noisePoint = texture2D(noiseTexture, gridUV).xyz;

    // Sample color from cover texture
    vec3 coverColor = texture2D(cover1, gridUV + speed*0.).xyz;

    // Calculate spatial range and scale based on kick
    float range = 35.0 - kick*30.;
    float scale = 3. - kick * 2.9;

    // Offset for instance position
    float offsetX = point.r * range - range / 2.0;
    float offsetZ = point.b * range - range / 2.0;
    float offsetY = point.g * range - range / 2.0;

    // Assign color for fragment shader
    pixelColor = coverColor;

    // Calculate per-instance scale based on color and kickCount
    float subScale = pixelColor.r;

    // Select subScale based on kickCount without if/else
    float mod2 = step(0.5, 1.0 - abs(mod(kickCount, 2.0)));
    float mod3 = step(0.5, 1.0 - abs(mod(kickCount, 3.0)));
    subScale = pixelColor.r * mod2
             + pixelColor.g * (1.0 - mod2) * mod3
             + pixelColor.b * (1.0 - mod2) * (1.0 - mod3);

    // Apply scaling and noise
    transformed *= (scale * subScale) * (1. - kick);
    transformed *= circularNoise.b * 2.;

    // Translate instances in 3D space
    vec3 instanceOffset = vec3(offsetX, offsetY, offsetZ);
    transformed += instanceOffset;

    // Pass data to fragment shader
    vInstancePosition = instanceOffset;
    vGridUV = gridUV;


#FRAGMENT

// =====================
// Fragment Shader Header
// =====================
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

// =====================
// Fragment Shader Body
// =====================
##BODY
    // Use color passed from vertex shader
    vec3 col = pixelColor;

    // Output final color
    vec4 diffuseColor = vec4(col, 1.);
