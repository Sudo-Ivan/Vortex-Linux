#include <errno.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#include "landlock_sandbox.h"
#include "seccomp_sandbox.h"

#define MAX_PATHS 64

typedef struct {
  const char *paths[MAX_PATHS];
  size_t count;
} path_buffer;

static void usage(const char *argv0) {
  fprintf(stderr,
          "Usage: %s [--probe] [--allow-rw PATH]... [--allow-ro PATH]... [--allow-tcp] "
          "[--no-seccomp] -- COMMAND [ARGS...]\n",
          argv0);
}

static int append_path(path_buffer *buffer, const char *path) {
  if (buffer->count >= MAX_PATHS) {
    fprintf(stderr, "installer-sandbox: too many sandbox paths\n");
    return -1;
  }
  buffer->paths[buffer->count++] = path;
  return 0;
}

static int run_probe(void) {
  int abi = vortex_landlock_probe();
  if (abi <= 0) {
    return 1;
  }
  printf("%d\n", abi);
  return 0;
}

int main(int argc, char **argv) {
  path_buffer read_write = {0};
  path_buffer read_only = {0};
  int allow_tcp = 0;
  int use_seccomp = 1;
  int command_index = -1;

  for (int i = 1; i < argc; i++) {
    if (strcmp(argv[i], "--probe") == 0) {
      return run_probe();
    }
    if (strcmp(argv[i], "--allow-rw") == 0) {
      if (i + 1 >= argc) {
        usage(argv[0]);
        return 2;
      }
      if (append_path(&read_write, argv[++i]) != 0) {
        return 1;
      }
      continue;
    }
    if (strcmp(argv[i], "--allow-ro") == 0) {
      if (i + 1 >= argc) {
        usage(argv[0]);
        return 2;
      }
      if (append_path(&read_only, argv[++i]) != 0) {
        return 1;
      }
      continue;
    }
    if (strcmp(argv[i], "--allow-tcp") == 0) {
      allow_tcp = 1;
      continue;
    }
    if (strcmp(argv[i], "--no-seccomp") == 0) {
      use_seccomp = 0;
      continue;
    }
    if (strcmp(argv[i], "--") == 0) {
      command_index = i + 1;
      break;
    }
    usage(argv[0]);
    return 2;
  }

  if (command_index < 0 || command_index >= argc) {
    usage(argv[0]);
    return 2;
  }

  vortex_path_list rw_list = {.paths = read_write.paths, .count = read_write.count};
  vortex_path_list ro_list = {.paths = read_only.paths, .count = read_only.count};

  if (vortex_landlock_apply(&rw_list, &ro_list, allow_tcp) != 0) {
    return 1;
  }

  if (use_seccomp && vortex_seccomp_apply() != 0) {
    return 1;
  }

  execvp(argv[command_index], argv + command_index);
  fprintf(stderr, "installer-sandbox: exec failed: %s\n", strerror(errno));
  return 1;
}
