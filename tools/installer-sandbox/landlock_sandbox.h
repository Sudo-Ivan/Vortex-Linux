#ifndef VORTEX_LANDLOCK_SANDBOX_H
#define VORTEX_LANDLOCK_SANDBOX_H

#include <stddef.h>

typedef struct vortex_path_list {
  const char **paths;
  size_t count;
} vortex_path_list;

int vortex_landlock_probe(void);

int vortex_landlock_apply(
    const vortex_path_list *read_write_paths,
    const vortex_path_list *read_only_paths,
    int allow_tcp);

#endif
