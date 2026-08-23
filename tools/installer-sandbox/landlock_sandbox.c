#define _GNU_SOURCE
#include "landlock_sandbox.h"

#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <string.h>
#include <sys/prctl.h>
#include <unistd.h>

#include "landlock_uapi.h"

static uint64_t fs_write_rights(void) {
  return LANDLOCK_ACCESS_FS_WRITE_FILE | LANDLOCK_ACCESS_FS_MAKE_REG |
         LANDLOCK_ACCESS_FS_MAKE_DIR | LANDLOCK_ACCESS_FS_REMOVE_DIR |
         LANDLOCK_ACCESS_FS_REMOVE_FILE | LANDLOCK_ACCESS_FS_TRUNCATE |
         LANDLOCK_ACCESS_FS_REFER;
}

static uint64_t fs_read_rights(void) {
  return LANDLOCK_ACCESS_FS_EXECUTE | LANDLOCK_ACCESS_FS_READ_FILE |
         LANDLOCK_ACCESS_FS_READ_DIR;
}

static void trim_ruleset_for_abi(int abi, struct landlock_ruleset_attr *ruleset_attr) {
  switch (abi) {
    case 1:
      ruleset_attr->handled_access_fs &= ~LANDLOCK_ACCESS_FS_REFER;
      __attribute__((fallthrough));
    case 2:
      ruleset_attr->handled_access_fs &= ~LANDLOCK_ACCESS_FS_TRUNCATE;
      __attribute__((fallthrough));
    case 3:
      ruleset_attr->handled_access_net &=
          ~(LANDLOCK_ACCESS_NET_BIND_TCP | LANDLOCK_ACCESS_NET_CONNECT_TCP);
      __attribute__((fallthrough));
    case 4:
      ruleset_attr->handled_access_fs &= ~LANDLOCK_ACCESS_FS_IOCTL_DEV;
      __attribute__((fallthrough));
    case 5:
      ruleset_attr->scoped &=
          ~(LANDLOCK_SCOPE_ABSTRACT_UNIX_SOCKET | LANDLOCK_SCOPE_SIGNAL);
      __attribute__((fallthrough));
    case 6:
    case 7:
    case 8:
      ruleset_attr->handled_access_fs &= ~LANDLOCK_ACCESS_FS_RESOLVE_UNIX;
      __attribute__((fallthrough));
    case 9:
      ruleset_attr->handled_access_net &=
          ~(LANDLOCK_ACCESS_NET_BIND_UDP | LANDLOCK_ACCESS_NET_CONNECT_SEND_UDP);
      break;
    default:
      break;
  }
}

static int add_path_rule(
    int ruleset_fd,
    const char *path,
    uint64_t allowed_access,
    uint64_t handled_access_fs) {
  struct landlock_path_beneath_attr path_beneath = {
      .allowed_access = allowed_access & handled_access_fs,
      .parent_fd = -1,
  };

  if (path_beneath.allowed_access == 0) {
    return 0;
  }

  path_beneath.parent_fd = open(path, O_PATH | O_CLOEXEC);
  if (path_beneath.parent_fd < 0) {
    fprintf(stderr, "installer-sandbox: failed to open landlock path %s: %s\n", path,
            strerror(errno));
    return -1;
  }

  if (landlock_add_rule(ruleset_fd, LANDLOCK_RULE_PATH_BENEATH, &path_beneath, 0) != 0) {
    fprintf(stderr, "installer-sandbox: failed to add landlock rule for %s: %s\n", path,
            strerror(errno));
    close(path_beneath.parent_fd);
    return -1;
  }

  close(path_beneath.parent_fd);
  return 0;
}

static int add_paths(
    int ruleset_fd,
    const vortex_path_list *paths,
    uint64_t allowed_access,
    uint64_t handled_access_fs) {
  for (size_t i = 0; i < paths->count; i++) {
    if (paths->paths[i] == NULL || paths->paths[i][0] == '\0') {
      continue;
    }
    if (add_path_rule(ruleset_fd, paths->paths[i], allowed_access, handled_access_fs) != 0) {
      return -1;
    }
  }
  return 0;
}

static int add_tcp_rule(int ruleset_fd, uint64_t handled_access_net) {
  struct landlock_net_port_attr net_port = {
      .allowed_access =
          (LANDLOCK_ACCESS_NET_BIND_TCP | LANDLOCK_ACCESS_NET_CONNECT_TCP) &
          handled_access_net,
      .port = 0,
  };

  if (net_port.allowed_access == 0) {
    return 0;
  }

  if (landlock_add_rule(ruleset_fd, LANDLOCK_RULE_NET_PORT, &net_port, 0) != 0) {
    fprintf(stderr, "installer-sandbox: failed to add tcp landlock rule: %s\n",
            strerror(errno));
    return -1;
  }

  return 0;
}

int vortex_landlock_probe(void) {
  int abi = landlock_create_ruleset(NULL, 0, LANDLOCK_CREATE_RULESET_VERSION);
  if (abi < 0) {
    return 0;
  }
  return abi;
}

int vortex_landlock_apply(
    const vortex_path_list *read_write_paths,
    const vortex_path_list *read_only_paths,
    int allow_tcp) {
  int abi = vortex_landlock_probe();
  if (abi <= 0) {
    fprintf(stderr, "installer-sandbox: landlock is not available on this kernel\n");
    return -1;
  }

  struct landlock_ruleset_attr ruleset_attr = {
      .handled_access_fs = fs_write_rights(),
      .handled_access_net =
          allow_tcp ? (LANDLOCK_ACCESS_NET_BIND_TCP | LANDLOCK_ACCESS_NET_CONNECT_TCP) : 0,
      .scoped = LANDLOCK_SCOPE_ABSTRACT_UNIX_SOCKET | LANDLOCK_SCOPE_SIGNAL,
  };

  trim_ruleset_for_abi(abi, &ruleset_attr);

  int ruleset_fd = landlock_create_ruleset(&ruleset_attr, sizeof(ruleset_attr), 0);
  if (ruleset_fd < 0) {
    fprintf(stderr, "installer-sandbox: failed to create landlock ruleset: %s\n",
            strerror(errno));
    return -1;
  }

  if (add_paths(ruleset_fd, read_write_paths, fs_write_rights() | fs_read_rights(),
                ruleset_attr.handled_access_fs) != 0) {
    close(ruleset_fd);
    return -1;
  }

  if (add_paths(ruleset_fd, read_only_paths, fs_read_rights(),
                ruleset_attr.handled_access_fs) != 0) {
    close(ruleset_fd);
    return -1;
  }

  if (allow_tcp && add_tcp_rule(ruleset_fd, ruleset_attr.handled_access_net) != 0) {
    close(ruleset_fd);
    return -1;
  }

  if (prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0) != 0) {
    fprintf(stderr, "installer-sandbox: failed to set NO_NEW_PRIVS: %s\n", strerror(errno));
    close(ruleset_fd);
    return -1;
  }

  if (landlock_restrict_self(ruleset_fd, 0) != 0) {
    fprintf(stderr, "installer-sandbox: failed to enforce landlock ruleset: %s\n",
            strerror(errno));
    close(ruleset_fd);
    return -1;
  }

  close(ruleset_fd);
  return 0;
}
