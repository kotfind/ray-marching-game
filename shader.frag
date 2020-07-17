#version 400

#define inf 1000000.
#define M_PI 3.1415926

#define RAY_INTERACTION_TRASHOLD 0.01
#define RAY_OUTLINE_TRASHOLD 0.02
#define MARCHING_ITERATIONS 50.
#define ZFAR 30.

uniform float time;
uniform ivec2 resolution;

uniform vec3 playerpos;
uniform vec3 ff;
uniform vec3 uu;
uniform vec3 rr;

uniform int state;
uniform float stateb;

uniform int arrows;          // arrow array size
uniform vec3 arrow[2 * 10]; // pair of coordinates of the begining and the ending of the arrow

// enum state
#define STATE_NOTHING    0
#define STATE_PULLED_BOW 1

// perlin noise
float N21(in vec2 p) { return fract(sin(p.x * 2383. + p.y * 4993.) * 6827.); }

float smoothnoise(vec2 uv) {
    const vec2 e = vec2(0., 1.);

    uv *= 10.;

    vec2 lv = fract(uv);
    vec2 id = floor(uv);
    lv = lv*lv*(3. - 2.*lv);

    return mix(mix(N21(id + e.xx),
                N21(id + e.yx), lv.x),
            mix(N21(id + e.xy),
                N21(id + e.yy), lv.x), lv.y);
}

float noise(in vec2 uv) {
    float c = 0.;
    float p2 = 1.;
    for (float i = 0.; i < 5.; ++i) {
        c += smoothnoise(uv * p2) / p2;
        p2 *= 2.;
    }
    return c / 2.;
}

// SDFs (Signed Distance Functions)
float sdSphere(in vec3 p, in vec3 c, in float r) { return distance(p, c) - r; }

float sdLine(in vec3 p, in vec3 a, in vec3 b, in float r) {
    vec3 ap = p - a;
    vec3 ab = b - a;
    float h = clamp(dot(ap, ab) / dot(ab, ab), 0., 1.);
    return length(ap - ab*h) - r;
}

// returns vec2(dist, material number)
vec2 map(in vec3 p) {
    float d = inf;
    float c = -1.;

    // Floor
    {
        float d1 = p.y;
        if (d1 < d) {
            d = d1;
            c = 1.;
        }
    }

    // Sphere
    {
        float d1 = sdSphere(p, vec3(0., 0., 10.), 2.);
        if (d1 < d) {
            d = d1;
            c = 2.;
        }
    }

    // Bow
    {
        float T, z;
        if (state == STATE_PULLED_BOW) {
            T = min(time - stateb, 0.5) / 0.5;
            z = -0.15 - 0.74 * T;
        } else {
            T = min(time - stateb, 0.05) / 0.05;
            z = -0.15 - 0.74 * (1.-T);
        }

        vec3 p2 = p;
        p2 -= playerpos;
        p2 = vec3(dot(rr, p2), dot(uu, p2), dot(ff, p2));
        p2 -= vec3(0.05, -0.3, 0.7);
        float a = -M_PI/4.;
        p2.xy = mat2(cos(a), -sin(a), sin(a), cos(a)) * p2.xy;
        p2.y = abs(p2.y);
        float d1 =   sdLine(p2, vec3(0., 0., 0.02), vec3(0., 0.2, 0.), 0.01);
        d1 = min(d1, sdLine(p2, vec3(0., 0.2, 0.), vec3(0., 0.5, -0.15), 0.01));
        if (d1 < d) {
            d = d1;
            c = 3.;
        }

        // Bowstring
        d1 =         sdLine(p2, vec3(0.,  0.5, -0.15), vec3(-0.02, 0., z), 0.0005);
        d1 = min(d1, sdLine(p2, vec3(0., -0.5, -0.15), vec3(-0.02, 0., z), 0.0005));
        if (d1 < d) {
            d = d1;
            c = 4.;
        }

        // Arrow
        d1 = sdLine(p2, vec3(-0.02, 0., z), vec3(-0.02, 0., z + 0.9), 0.002);
        if (d1 < d) {
            d = d1;
            c = 3.;
        }
    }

    // Arrows
    {
        float d1 = inf;
        for (int i = 0; i < 2 * arrows; i += 2) {
            d1 = min(d1, sdLine(p, arrow[i], arrow[i + 1], 0.005));
        }
        if (d1 < d) {
            d = d1;
            c = 3.;
        }
    }

    return vec2(d, c);
}

vec2 cast_ray(in vec3 ro, in vec3 rd) {
    float t = RAY_INTERACTION_TRASHOLD * 10.;
    vec2 h;
    float lasth = inf;
    for (float i = 0.; i < MARCHING_ITERATIONS; ++i) {
        vec3 p = ro + rd * t;

        h = map(p);
        if (abs(h.x) < RAY_INTERACTION_TRASHOLD) break;
        if (t > ZFAR) {
            t = inf;
            break;
        }
        if (lasth < h.x && h.x < RAY_OUTLINE_TRASHOLD * sqrt(t)) {
            h.y = 0.;
            break;
        }
        t += h.x;
        lasth = h.x;
    }
    return vec2(t, h.y);
}

vec3 calc_norm(in vec3 p) {
    vec2 e = vec2(0., 0.001);
    float d = map(p).x;
    float x = map(p + e.yxx).x - d;
    float y = map(p + e.xyx).x - d;
    float z = map(p + e.xxy).x - d;
    return normalize(vec3(x, y, z));
}

out vec4 fragColor;
void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5*vec2(resolution)) / float(min(resolution.x, resolution.y));

    vec3 ro = playerpos;
    vec3 rd = normalize(vec3(uv.x*rr + uv.y*uu + 1.*ff));

    vec3 col = vec3(0.357, 0.737, 0.894);

    vec2 t = cast_ray(ro, rd);
    if (t.x < inf - 10.) {
        vec3 p = ro + t.x * rd;
        vec3 norm = calc_norm(p);

        vec3 c = vec3(1.);
        // outline
        if (t.y < 0.5)      c = vec3(0.);
        // grass
        else if (t.y < 1.5) c = vec3(0., 0.8, 0.) * (noise(p.xz / 10.) * 0.3 + 0.7);
        // sphere
        else if (t.y < 2.5) c = vec3(1.);
        // bow (wood)
        else if (t.y < 3.5) c = vec3(0.651, 0.502, 0.392);
        // bow (string)
        else if (t.y < 4.5) c = vec3(0.);

        vec3 sun_dir = normalize(vec3(5., 10., -5.));
        float sun_dif = clamp(dot(sun_dir, norm),                      0.,  1.);
        float sun_sha = clamp(step(inf - 10., cast_ray(p, sun_dir).x), 0.4, 1.);
        col = c * clamp(sun_dif * sun_sha, 0.2, 0.9);
    }

    col = pow(col, vec3(0.4545));

    //if (abs(uv.x) > 0.5 && abs(uv.x) < 0.505) col = vec3(1., 0., 0.);
    //if (abs(uv.y) > 0.5 && abs(uv.y) < 0.505) col = vec3(1., 0., 0.);

    fragColor = vec4(col, 1.);
}
