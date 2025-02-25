varying vec3 vUv;
uniform float iTime;
uniform float t;
uniform vec2 u_resolution;
uniform float u_volume;
uniform float u_fade;
uniform float u_tempo;
uniform float u_mode;
uniform float u_beat_confidence;
uniform float u_beat;
uniform float u_beat_index;
uniform float u_beat_next;
uniform float u_pallete_size;
uniform vec3 u_pallete_1;
uniform vec3 u_pallete_2;
uniform vec3 u_pallete_3;
uniform vec3 COLOR_PURPLE;
uniform vec3 MOUNTAIN_COLOR;
uniform vec3 COLOR_NIGHT_SUN;
uniform vec3 COLOR_NIGHT_MOUNTAIN;
uniform vec3 COLOR_NIGHT_GRID;

const float MAX_STEPS = 10.;
const float MIN_DISTANCE = 0.01;
const float MAX_DISTANCE = 16.;
const float GRID_SIZE = 4.;
const float speed = 6.;
// const vec3 MOUNTAIN_COLOR  = vec3(0.54, 0.11, 1.);
// const vec3 COLOR_PURPLE = vec3(0.81, 0.19, 0.78);
const vec3 COLOR_LIGHT = vec3(0.14, 0.91, 0.98);
const vec3 COLOR_SUN = vec3(1., 0.56, 0.098);
const float MATERIAL_PLANE = 1.;
const float MATERIAL_BACK = 2.;
const float GRID_THICKNESS = .2;
// const vec3 COLOR_NIGHT_GRID = vec3(0., .15, 0.);
// const vec3 COLOR_NIGHT_SUN = vec3(0.5, .0, 0.);
// const vec3 COLOR_NIGHT_MOUNTAIN = vec3(0.9, .3, 0.1);
const float SUNSET_SPEED = 3.;

vec3 lightPos = vec3(0., 3., -10.);

struct traceResult {
    bool  isHit;
    float distanceTo;
    float material;
    float planeHeight;
    vec3 planeNormal;
};

struct getDistResult {
    float distanceTo;
    float material;
    float planeHeight;
    vec3 planeNormal;
};

float sdPlane(vec3 p, float h) {
    return p.y - h;
}

float N21(vec2 p) {
    return fract(sin(p.x*223.32+p.y*5677.)*4332.23);
}

mat2 rot2d(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat2(vec2(c,-s), vec2(s,c));
}

float getHeight(vec2 id) {
    float ax = abs(id.x);
    if (ax < GRID_SIZE) {
        return 0.;
    }

    float n = N21(id);

    float wave = sin(id.y/9. + cos(id.x/3.))*sin(id.x/9. + sin(id.y/4.));

    wave = clamp((wave * .5 + .5) + n*.15 - .6, 0., 1.);
    if (ax < (GRID_SIZE + 5.) && ax >= GRID_SIZE) {
        wave *= (ax - GRID_SIZE + 1.)*.2;
    }
    return (wave*8. + u_volume*fract(n*123.32)*.5)*u_fade;
}


getDistResult getDist(vec3 p) {
    float size = GRID_SIZE;
    vec3 nuv = p * size + vec3(0., 0., iTime * speed);
    vec2 uv = fract(nuv).xz;
    vec2 id = floor(nuv).xz;

    vec2 lv = uv;

    float bl = getHeight(id);
    float br = getHeight(id + vec2(1., 0.));
    float b = mix(bl, br, lv.x);

    float tl = getHeight(id + vec2(0., 1.));
    float tr = getHeight(id + vec2(1., 1.));
    float t = mix(tl, tr, lv.x);

    float height = mix(b,t, lv.y);

    float O = bl;
    float R = br;
    float T = getHeight(id + vec2(0. -1.));
    float B = tl;
    float L = getHeight(id + vec2(-1., 0));

    vec3 n = vec3(2.*(R-L), 2.*(B-T), -4.);


    float d = sdPlane(p, -.5 + 0.3*height);

    float db = -p.z + MAX_DISTANCE*.4;
    d = min(d, db);

    getDistResult result;

    result.distanceTo = d;
    result.material = MATERIAL_PLANE;
    result.planeHeight = height;
    result.planeNormal = normalize(n);

    if (d == db) {
        result.material = MATERIAL_BACK;
    }

    return result;
}

traceResult trace(vec3 ro, vec3 rd) {
    traceResult result;
    float ds, dt;
    getDistResult dist;
    for(int i = 0 ; i < 200 ; i++) {
        vec3 p = ro + rd * ds;
        dist = getDist(p);
        dt = dist.distanceTo;
        ds += dt * .6;
        if (abs(dt) < MIN_DISTANCE || ds > MAX_DISTANCE) {
            break;
        }
    }
    result.isHit = abs(dt) < MIN_DISTANCE;
    result.distanceTo = ds;
    result.material = dist.material;
    result.planeHeight = dist.planeHeight;
    result.planeNormal = dist.planeNormal;
    return result;
}

float getLightDiffuse(vec3 p, float material, float height, vec3 normal) {
    vec3 l = normalize(lightPos - p);
    float dif = clamp(dot(normal, l), 0., 1.);
    return dif;
}

vec3 starsLayer(vec2 ouv) {
    vec3 col = vec3(0.);

    vec2 uv = fract(ouv) - .5;

    float d;

    for(int x = -1 ; x <= 1; x++) {
        for(int y = -1 ; y <= 1; y++) {
            vec2 offset = vec2(x,y);
            vec2 id = floor(ouv) + offset;
            float n = N21(id);
            if (n > .7) {
                float n1 = fract(n*123.432);
                float n2 = fract(n*154234.2432);

                float size = .01 + 0.05 * (n1 - .5);

                vec2 shift = vec2(n1 - .5, n2 - .5);
                // if (u_beat_confidence < .3) {
                    d = max(d, step((.15 - u_volume*0.02),size/length(uv - offset + shift)));
                // } else {
                    // d = max(d, size/length(uv - offset + shift));
                // }

            }
        }
    }


    if (u_pallete_size > 0.) {
        return col + d*COLOR_PURPLE;
    } else {
        return col + d*0.;//vec3(.1, .9, .1);
    }

}

vec3 backgroundStars(vec2 uv) {
    vec3 col = vec3(0.);
    if (u_pallete_size > 0.) {
        // col = u_pallete_1;
    }

    float t = iTime * (speed / 30.);

    float layers = 3.;

    for(float i = 0. ; i < 1. ; i+= 1./layers) {
        float depth = fract(i + t);
        float scale = mix(20., .5, depth);
        float fade = depth * smoothstep(1., .9, depth);

        vec3 sl = starsLayer(uv * scale + i * 456.32) * fade;
        // if (sl.r > 0. || sl.g > 0. || sl.b > 0.) {
        //     col = mix(col, sl, .8);
        // }
        col += sl;
    }
    return col;
}

vec3 getOthersideBackground(vec2 uv) {
    return backgroundStars(uv/8. + sin(iTime/(speed)));
}

vec3 getBackground(vec2 uv) {
    float set = 0. - clamp(sin(iTime/SUNSET_SPEED)*3., -1., 2.);

    float sunDist = length(uv + vec2(0., -2.5 - set));
    float sun = 1. - smoothstep(2.35, 2.5, sunDist);

    float gradient = sin(uv.y/4. - 3.14/32. + set/3.)*2.;
    float bands = abs(sin(uv.y * 8. + iTime*2.)) * (1. - step(2.5 + set, uv.y));

    float skyTop = 2.12/distance(uv, vec2(uv.x, 9.5));
    float skyBottom = 1.12/distance(uv, vec2(uv.x, -1.5));

    vec3 result;

    // sun

    if (set < -1.8) {
        result = vec3(sun) * (bands > 0. ? bands : 1.) * mix(vec3(0.), COLOR_NIGHT_SUN, ((abs(set) - 1.6) -.2) * 15.);
        float glow = smoothstep(.1, .5, (1.1)/sunDist);
        result += glow * COLOR_NIGHT_SUN;
    } else {
        vec3 sun_color = mix(MOUNTAIN_COLOR, COLOR_NIGHT_SUN, set);
        result = vec3(sun * gradient * (bands > 0. ? bands : 1.)) * sun_color;
        float glow = smoothstep(.1, .5, (1.1)/sunDist);
        result += glow * sun_color;
        //glow
        // float glow = smoothstep(.1, .5, (1.1)/sunDist) + clamp(-1., 1., set);
        // result += glow * COLOR_PURPLE;

        // sky
        // result += max(glow * COLOR_PURPLE, ((skyTop * MOUNTAIN_COLOR) + (skyBottom * COLOR_PURPLE))*(1. + set));
    }



    if (sun < .5) {
        // stars
        vec2 nuv = uv*2.;// + vec2(iTime, 0.);
        vec2 rize = vec2(-10., 12.);
        nuv -= rize;
        nuv *= rot2d(mod(-iTime/15., 6.28));
        nuv += rize;
        uv = fract(nuv);
        vec2 id = floor(nuv);
        uv -= .5;

        float n = N21(id);
        uv.x += fract(n*100.32) - .5;
        uv.y += fract(n*11323.432) - .5;

        float star = smoothstep(.5, 1., (0.03 + (0.02 * (fract(n*353.32) - .5)))/length(uv));

        result += star * step(.8, n);
    }

    return result;
}
float filterWidth2(vec2 uv)
{
     vec2 dx = dFdx(uv), dy = dFdy(uv);
    return dot(dx, dx) + dot(dy, dy) + .0001;
}

// (c) spalmer https://www.shadertoy.com/view/wl3Sz2
float gridPow(vec2 uv)
{
    float newSpeed = speed;
    if (abs(uv.x) < .735) {
        newSpeed = 0.;
    }
    vec2 p = uv * GRID_SIZE + vec2(0., iTime * newSpeed);
    const float fadePower = 16.;
    vec2 f = fract(p);
    f = .5 - abs(.5 - f);
    f = max(vec2(0), 1. - f + .5*GRID_THICKNESS);
    f = pow(f, vec2(fadePower));
    float g = f.x+f.y; //max(f.x, f.y); //
    float s = sqrt(GRID_THICKNESS);
    return mix(g, s, exp2(-.01 / filterWidth2(p)));
}

vec3 getRoad(vec3 p) {
    float road = step(abs(p.x + sin(p.z)*.06), .05);//-(u_volume*.02));

    float stripes = smoothstep(0., 0.3 , sin(p.z*3. + iTime*speed));

    return road * stripes * COLOR_PURPLE;//vec3(.9, .3, .1);
}

vec3 getAlbedo(vec3 p, float material, float height, vec3 normal) {
    if (material == MATERIAL_BACK) {
        return getBackground(p.xy);
    }

    float sunSet = sin(iTime/SUNSET_SPEED)*.5 + .5;

    vec3 col = vec3(0.);
    float grid = gridPow(p.xz);

    float maxHeight = 2.5;

    vec3 grid_color = COLOR_PURPLE;
    vec3 cell_color = vec3(0.);
    vec3 mountain_color = MOUNTAIN_COLOR;
    mountain_color = mix(mountain_color, COLOR_NIGHT_MOUNTAIN, sunSet);

    if (height > 0.) {
        grid_color = mix(COLOR_PURPLE, COLOR_LIGHT, height/maxHeight);
        cell_color = mountain_color * mix(vec3(0.), mountain_color, height/maxHeight);
    }

    if (abs(p.x) < .735) {
        return vec3(0.);
    }

    grid_color = mix(grid_color, COLOR_NIGHT_GRID, sunSet);

    col = mix(vec3(0.), grid_color, grid) + cell_color;

    return vec3(col);
}

float polarTriangle(vec2 uv, float offset) {
    float n = N21(vec2(32., u_beat_index));
    float a = 0.;
    if (fract(n*3443.33) > .7) {
        float n1 = .8 + (fract(n*234234.234234)*1.2 - .3);
        float n2 = .8 + (fract(n*443.33)*1.2 - .4);
        a = atan(uv.x*n1, uv.y*n2) + offset;
    } else {
        a = atan(uv.x, uv.y) + offset;
    }

    float b = 6.28 / (2. + floor(4. * n));
    float l = length(uv);

    // float d = cos(a - floor(.3+sin(t) + a/b) * b) * l;
    float d = 0.;
    if (fract(n*34333.33) > .6) {
        d = cos(a - floor(.5 + a/b) * b) * l;
    } else {
        d = cos(a - floor(.5 + a/b) * b) * l;
    }

    return d;
}

float triangleMask(vec2 uv) {
    return polarTriangle(uv + vec2(0., -.1),3.14 + .5*sin(iTime));
}


void main() {
    vec2 uv = vUv.xy / u_resolution;
    uv.x *= u_resolution.x / u_resolution.y;

    vec2 mouse = vec2(.5);

    lightPos.y = sin(iTime)*30.*u_volume;
    lightPos.y = cos(iTime)*30.*u_volume;
    // lightPos.z = cos(iTime)*10.*u_volume;

    mouse.x = 0.5;
    mouse.y = 0.;

    vec3 col = vec3(0.);

    if (u_pallete_size > 0.) {
        col = u_pallete_1;
    }

    vec3 ro = vec3(0.,0.,-1.3);
    vec3 lookat = vec3(0.,0., 0.);
    float zoom = .4;

    vec3 f = normalize(lookat - ro);
    vec3 r = normalize(cross(vec3(0., 1., 0), f));
    vec3 u = cross(f, r);
    vec3 c = ro + f * zoom;
    vec3 i = c + uv.x * r + uv.y * u;

    vec3 rd = normalize(i - ro);

    vec3 p = vec3(0.);

    traceResult tr = trace(ro, rd);

    if (tr.isHit) {

        p = ro + rd * tr.distanceTo;

        vec3 albedo = getAlbedo(p, tr.material, tr.planeHeight, tr.planeNormal);

        float diffuse = max(.1, getLightDiffuse(p, tr.material, tr.planeHeight, tr.planeNormal));

        if (tr.material == MATERIAL_BACK) {
            col = albedo;
        } else {
            col = diffuse * albedo;
            col += getRoad(p);
        }

        float triangle = triangleMask(uv);
        float fd = fract(triangle - clamp(sin(t/3.), 0., 2.));
        float bc = (1. - step(.2, fd));

        col *= (tr.material == MATERIAL_BACK) ? bc : 1.;

        if (bc == 0.) {
            if (tr.material == MATERIAL_BACK) {
                col = getOthersideBackground(p.xy);
            } else {
                col *= vec3(.8);
            }
        }

        col += ((1. - step(.2, fd)) - (1. - step(.19, fd)))*.3;

    }

    gl_FragColor = vec4(col * u_fade, 1.);
    // gl_FragColor.rgb = pow(gl_FragColor.rgb, vec3(1.0/2.2));
}