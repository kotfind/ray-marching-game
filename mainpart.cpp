#define GL_GLEXT_PROTOTYPES

#include <SDL2/SDL.h>
#include <SDL2/SDL_opengl.h>

#include <glm/glm.hpp>
#include <glm/gtc/type_ptr.hpp>
using glm::vec2;
using glm::vec3;

#include <math.h>

extern SDL_Window *win;
extern GLuint program;

struct {
    vec3 pos = vec3(0., 1.76, 0.);

    float theta = 0.;
    float phi   = 0.;

    const float fmspeed = 5.;    // forward  movement speed
    const float bmspeed = 4.;    // backward movement speed
    const float lmspeed = 4.5;   // left     movement speed
    const float rmspeed = 4.5;   // right    movement speed
    const float runfactor = 2.;  // run factor

    const float hrspeed = 0.002; // horisontal rotation speed
    const float vrspeed = 0.002; // vertical   rotation speed
} player;

// ff -- forward vector, uu -- up vector, rr -- right vector
void calc_direction_vectors(const float theta, const float phi, vec3 *ff, vec3 *uu, vec3 *rr) {
    *ff = normalize(vec3(sin(-phi + M_PI/2.) * cos(theta + M_PI/2.),
                         cos(-phi + M_PI/2.),
                         sin(-phi + M_PI/2.) * sin(theta + M_PI/2.)));
    *rr = normalize(cross(*ff, vec3(0., 1., 0.)));
    *uu = normalize(cross(*rr, *ff));
}

void mainpart(void) {
    // Get uniform locations
    GLuint uTime       = glGetUniformLocation(program, "time");
    GLuint uResolution = glGetUniformLocation(program, "resolution");
    GLuint uPlayerpos  = glGetUniformLocation(program, "playerpos");
    GLuint uFF         = glGetUniformLocation(program, "ff");
    GLuint uUU         = glGetUniformLocation(program, "uu");
    GLuint uRR         = glGetUniformLocation(program, "rr");

    SDL_SetRelativeMouseMode(SDL_TRUE);

    float last_time = SDL_GetTicks() / 1000.;
    // Mainloop
    for(;;) {
        // Time
        float time = SDL_GetTicks() / 1000.;
        float dtime = time - last_time;  // dtime -- delta time
        last_time = time;

        // Resolution
        int W, H;
        SDL_GetWindowSize(win, &W, &H);
        glViewport(0, 0, W, H);

        // Events loop
        bool quit = 0;
        SDL_Event e;
        while (SDL_PollEvent(&e) != 0) {
            if (e.type == SDL_QUIT) {
                quit = 1;
            }
            
            if (e.type == SDL_MOUSEMOTION) {
                player.phi   -= e.motion.yrel * player.vrspeed;
                player.theta += e.motion.xrel * player.hrspeed;

                player.phi = min(float(M_PI/2.), max(float(-M_PI/3.), player.phi));
            }
        }
        if (quit) break;

        // Logic
        const Uint8 *key = SDL_GetKeyboardState(NULL);

        // | calc direction vectors
        vec3 ff, uu, rr;
        vec3 ff_nophi, uu_nophi, rr_nophi;
        calc_direction_vectors(player.theta, player.phi, &ff, &uu, &rr);
        calc_direction_vectors(player.theta, 0., &ff_nophi, &uu_nophi, &rr_nophi);

        // | movements
        float factor = key[SDL_SCANCODE_SPACE] ? player.runfactor : 1.;
        if (key[SDL_SCANCODE_W]) player.pos += ff_nophi * vec3(dtime * player.fmspeed * factor);
        if (key[SDL_SCANCODE_S]) player.pos -= ff_nophi * vec3(dtime * player.bmspeed * factor);
        if (key[SDL_SCANCODE_D]) player.pos += rr_nophi * vec3(dtime * player.lmspeed * factor);
        if (key[SDL_SCANCODE_A]) player.pos -= rr_nophi * vec3(dtime * player.rmspeed * factor);
        
        float walkheigh = 0.;
        if (key[SDL_SCANCODE_W] || key[SDL_SCANCODE_S] || key[SDL_SCANCODE_A] || key[SDL_SCANCODE_D])
            if (key[SDL_SCANCODE_SPACE]) walkheigh = 0.14 * sin(time * 14.);
            else                          walkheigh = 0.07 * sin(time * 8.);

        // Set uniforms
        glUniform1f(uTime, time);
        glUniform2i(uResolution, W, H);
        glUniform3fv(uPlayerpos, 1, value_ptr(player.pos + vec3(0., walkheigh, 0.)));
        glUniform3fv(uFF, 1, value_ptr(ff));
        glUniform3fv(uUU, 1, value_ptr(uu));
        glUniform3fv(uRR, 1, value_ptr(rr));

        glClear(GL_COLOR_BUFFER_BIT);
        glRectf(-1., -1., 1., 1.);

        SDL_GL_SwapWindow(win);
    }
}
