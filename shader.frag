#version 400

#define inf 1000000.

#define RAY_INTERACTION_TRASHOLD 0.01
#define RAY_OUTLINE_TRASHOLD 0.03
#define MARCHING_ITERATIONS 50.
#define ZFAR 50.

uniform float time;
uniform ivec2 resolution;

uniform vec3 playerpos;
uniform vec3 ff;
uniform vec3 uu;
uniform vec3 rr;

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

// returns vec2(dist, material number)
vec2 map(in vec3 p) {
    float d = inf;
    float c = -1.;

    float d1 = p.y;
    if (d1 < d) {
        d = d1;
        c = 1.;
    }

    d1 = length(p - vec3(0., 0., 10.)) - 2.;
    if (d1 < d) {
        d = d1;
        c = 2.;
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
        if (lasth < h.x && h.x < RAY_OUTLINE_TRASHOLD) {
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
        //grass
        else if (t.y < 1.5) c = vec3(0., 0.8, 0.) * (noise(p.xz / 10.) * 0.3 + 0.7);
        // circle
        else if (t.y < 2.5) c = vec3(1.);

        vec3 sun_dir = normalize(vec3(5., 10., -5.));
        float sun_dif = clamp(dot(sun_dir, norm),                     0., 1.);
        float sun_sha = clamp(step(inf - 10., cast_ray(p, sun_dir).x), 0.4, 1.);
        col = c * clamp(sun_dif * sun_sha, 0.2, 0.9);
    }

    col = pow(col, vec3(0.4545));

    fragColor = vec4(col, 1.);
}
