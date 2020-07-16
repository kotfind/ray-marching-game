#define GL_GLEXT_PROTOTYPES

#include <SDL2/SDL.h>
#include <SDL2/SDL_opengl.h>
#include <iostream>

#include "mainpart.h"

using namespace std;

SDL_Window *win;
GLuint program;

int main(int argc, char **argv) {
    // SDL2 init
    SDL_Init(SDL_INIT_VIDEO);

    win = SDL_CreateWindow("",
            SDL_WINDOWPOS_CENTERED,
            SDL_WINDOWPOS_CENTERED,
            800, 600,
            SDL_WINDOW_OPENGL | SDL_WINDOW_SHOWN | SDL_WINDOW_RESIZABLE);
    SDL_GLContext cont = SDL_GL_CreateContext(win);
    
    // Load shader code from file
    FILE *fragment_shader_fp = fopen("shader.frag", "r");
    fseek(fragment_shader_fp, 0L, SEEK_END);
    long int fragment_shader_fs = ftell(fragment_shader_fp) + 1;
    rewind(fragment_shader_fp);

    char *fragment_shader = (char*) malloc(fragment_shader_fs * sizeof(char));
    for (int i = 0; i < fragment_shader_fs; ++i) {
        fragment_shader[i] = fgetc(fragment_shader_fp);
    }
    fragment_shader[fragment_shader_fs - 1] = 0;

    fclose(fragment_shader_fp);

    // Shader
    GLuint shader = glCreateShader(GL_FRAGMENT_SHADER);
    glShaderSource(shader, 1, (const GLchar**)&fragment_shader, NULL);
    glCompileShader(shader);

    // Check shader for errors
    GLint success = 0;
    glGetShaderiv(shader, GL_COMPILE_STATUS, &success);
    if (success == GL_FALSE) {
        GLint len = 0;
        glGetShaderiv(shader, GL_INFO_LOG_LENGTH, &len);

        char *errlog = (char*) malloc(len * sizeof(char));
        glGetShaderInfoLog(shader, len, &len, errlog);

        cerr << errlog << '\n';

        glDeleteShader(shader);
        SDL_GL_DeleteContext(cont);
        SDL_DestroyWindow(win);
        SDL_Quit();
        return -1;
    }

    // Shader program
    program = glCreateProgram();
    glAttachShader(program, shader);
    glLinkProgram(program);
    glUseProgram(program);

    glDisable(GL_DEPTH_TEST);

    // Main part
    mainpart();

    // Quit
    SDL_GL_DeleteContext(cont);
    SDL_DestroyWindow(win);
    SDL_Quit();
}
