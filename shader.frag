#version 400

#define inf 1000000.

uniform float time;
uniform ivec2 resolution;

uniform vec3 playerpos;
uniform vec3 ff;
uniform vec3 uu;
uniform vec3 rr;

float map(in vec3 p) {
    float d = inf;

    float d1 = p.y - (-1.);
    d = min(d1, d);

    d1 = length(p - vec3(0., 0., 10.)) - 1.;
    d = min(d, d1);

    return d;
}

float cast_ray(in vec3 ro, in vec3 rd) {
    float t = 0.01;
    for (int i = 0; i < 100; ++i) {
        vec3 p = ro + rd * t;

        float h = map(p);
        if (h < 0.001) break;
        if (t > 100.) {
            t = inf;
            break;
        }
        t += h;
    }
    return t;
}

vec3 calc_norm(in vec3 p) {
    vec2 e = vec2(0., 0.001);
    float d = map(p);
    float x = map(p + e.yxx) - d;
    float y = map(p + e.xyx) - d;
    float z = map(p + e.xxy) - d;
    return normalize(vec3(x, y, z));
}

out vec4 fragColor;
void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5*vec2(resolution)) / float(min(resolution.x, resolution.y));

    vec3 ro = playerpos;
    vec3 rd = normalize(vec3(uv.x*rr + uv.y*uu + 1.*ff));

    vec3 col = vec3(0.);

    float t = cast_ray(ro, rd);
    if (t < inf - 10.) {
        vec3 p = ro + t * rd;
        vec3 norm = calc_norm(p);

        vec3 c = vec3(1.);

        vec3 sun_dir = normalize(vec3(5., 10., -5.));
        float sun_dif = clamp(dot(sun_dir, norm),                     0., 1.);
        float sun_sha = clamp(step(inf - 10., cast_ray(p, sun_dir)), 0.4, 1.);
        col = c * clamp(sun_dif * sun_sha, 0.2, 0.9);
    }

    col = pow(col, vec3(0.4545));

    fragColor = vec4(col, 1.);
}
