#ifndef VORTEX_LANDLOCK_UAPI_H
#define VORTEX_LANDLOCK_UAPI_H

#include <errno.h>
#include <linux/limits.h>
#include <stdint.h>
#include <sys/syscall.h>
#include <unistd.h>

#ifndef __NR_landlock_create_ruleset
#ifdef __x86_64__
#define __NR_landlock_create_ruleset 444
#define __NR_landlock_add_rule 445
#define __NR_landlock_restrict_self 446
#elif defined(__aarch64__)
#define __NR_landlock_create_ruleset 444
#define __NR_landlock_add_rule 445
#define __NR_landlock_restrict_self 446
#endif
#endif

#define LANDLOCK_CREATE_RULESET_VERSION 0x1U

#define LANDLOCK_ACCESS_FS_EXECUTE (1ULL << 0)
#define LANDLOCK_ACCESS_FS_WRITE_FILE (1ULL << 1)
#define LANDLOCK_ACCESS_FS_READ_FILE (1ULL << 2)
#define LANDLOCK_ACCESS_FS_READ_DIR (1ULL << 3)
#define LANDLOCK_ACCESS_FS_REMOVE_DIR (1ULL << 4)
#define LANDLOCK_ACCESS_FS_REMOVE_FILE (1ULL << 5)
#define LANDLOCK_ACCESS_FS_MAKE_CHAR (1ULL << 6)
#define LANDLOCK_ACCESS_FS_MAKE_DIR (1ULL << 7)
#define LANDLOCK_ACCESS_FS_MAKE_REG (1ULL << 8)
#define LANDLOCK_ACCESS_FS_MAKE_SOCK (1ULL << 9)
#define LANDLOCK_ACCESS_FS_MAKE_FIFO (1ULL << 10)
#define LANDLOCK_ACCESS_FS_MAKE_BLOCK (1ULL << 11)
#define LANDLOCK_ACCESS_FS_MAKE_SYM (1ULL << 12)
#define LANDLOCK_ACCESS_FS_REFER (1ULL << 13)
#define LANDLOCK_ACCESS_FS_TRUNCATE (1ULL << 14)
#define LANDLOCK_ACCESS_FS_IOCTL_DEV (1ULL << 15)
#define LANDLOCK_ACCESS_FS_RESOLVE_UNIX (1ULL << 16)

#define LANDLOCK_ACCESS_NET_BIND_TCP (1ULL << 0)
#define LANDLOCK_ACCESS_NET_CONNECT_TCP (1ULL << 1)
#define LANDLOCK_ACCESS_NET_BIND_UDP (1ULL << 2)
#define LANDLOCK_ACCESS_NET_CONNECT_SEND_UDP (1ULL << 3)

#define LANDLOCK_SCOPE_ABSTRACT_UNIX_SOCKET (1ULL << 0)
#define LANDLOCK_SCOPE_SIGNAL (1ULL << 1)

#define LANDLOCK_RESTRICT_SELF_LOG_SAME_EXEC (1ULL << 0)

#define LANDLOCK_RULE_PATH_BENEATH 1
#define LANDLOCK_RULE_NET_PORT 2

struct landlock_ruleset_attr {
  uint64_t handled_access_fs;
  uint64_t handled_access_net;
  uint64_t scoped;
  uint64_t no_log_access_fs;
  uint64_t no_log_access_net;
};

struct landlock_path_beneath_attr {
  uint64_t allowed_access;
  int parent_fd;
};

struct landlock_net_port_attr {
  uint64_t allowed_access;
  uint64_t port;
};

static inline int landlock_create_ruleset(
    const struct landlock_ruleset_attr *attr,
    size_t size,
    uint32_t flags) {
  return (int)syscall(__NR_landlock_create_ruleset, attr, size, flags);
}

static inline int landlock_add_rule(
    int ruleset_fd,
    int rule_type,
    const void *rule_attr,
    uint32_t flags) {
  return (int)syscall(__NR_landlock_add_rule, ruleset_fd, rule_type, rule_attr, flags);
}

static inline int landlock_restrict_self(int ruleset_fd, uint32_t flags) {
  return (int)syscall(__NR_landlock_restrict_self, ruleset_fd, flags);
}

#endif
