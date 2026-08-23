#include "seccomp_sandbox.h"

#include <errno.h>
#include <stdio.h>
#include <string.h>
#include <sys/prctl.h>
#include <unistd.h>

#ifdef VORTEX_HAVE_LIBSECCOMP
#include <seccomp.h>
#endif

int vortex_seccomp_apply(void) {
#ifdef VORTEX_HAVE_LIBSECCOMP
  if (prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0) != 0) {
    fprintf(stderr, "installer-sandbox: failed to set NO_NEW_PRIVS: %s\n", strerror(errno));
    return -1;
  }

  scmp_filter_ctx ctx = seccomp_init(SCMP_ACT_ERRNO(EACCES));
  if (ctx == NULL) {
    fprintf(stderr, "installer-sandbox: failed to initialize seccomp filter\n");
    return -1;
  }

  static const int allowed_syscalls[] = {
      SCMP_SYS(access),       SCMP_SYS(arch_prctl),   SCMP_SYS(bind),
      SCMP_SYS(brk),          SCMP_SYS(chdir),        SCMP_SYS(clock_gettime),
      SCMP_SYS(clone),        SCMP_SYS(clone3),       SCMP_SYS(close),
      SCMP_SYS(close_range),  SCMP_SYS(connect),      SCMP_SYS(dup),
      SCMP_SYS(dup2),         SCMP_SYS(dup3),         SCMP_SYS(epoll_create1),
      SCMP_SYS(epoll_ctl),    SCMP_SYS(epoll_pwait),  SCMP_SYS(epoll_wait),
      SCMP_SYS(execve),       SCMP_SYS(execveat),     SCMP_SYS(exit),
      SCMP_SYS(exit_group),   SCMP_SYS(faccessat),
      SCMP_SYS(faccessat2),   SCMP_SYS(fchmod),       SCMP_SYS(fcntl),
      SCMP_SYS(fdatasync),    SCMP_SYS(fstat),        SCMP_SYS(fstatfs),
      SCMP_SYS(ftruncate),    SCMP_SYS(futex),        SCMP_SYS(getcwd),
      SCMP_SYS(getdents64),   SCMP_SYS(getegid),      SCMP_SYS(geteuid),
      SCMP_SYS(getgid),       SCMP_SYS(getpid),       SCMP_SYS(getppid),
      SCMP_SYS(getrandom),    SCMP_SYS(getrlimit),    SCMP_SYS(gettid),
      SCMP_SYS(getuid),       SCMP_SYS(ioctl),        SCMP_SYS(listen),
      SCMP_SYS(lseek),        SCMP_SYS(lstat),        SCMP_SYS(madvise),
      SCMP_SYS(memfd_create), SCMP_SYS(mkdir),        SCMP_SYS(mmap),
      SCMP_SYS(mprotect),     SCMP_SYS(mremap),       SCMP_SYS(munmap),
      SCMP_SYS(nanosleep),    SCMP_SYS(newfstatat),   SCMP_SYS(open),         SCMP_SYS(openat),
      SCMP_SYS(openat2),      SCMP_SYS(pipe2),        SCMP_SYS(poll),
      SCMP_SYS(ppoll),        SCMP_SYS(pread64),      SCMP_SYS(prlimit64),
      SCMP_SYS(pwrite64),     SCMP_SYS(read),         SCMP_SYS(readlink),
      SCMP_SYS(readlinkat),   SCMP_SYS(readv),        SCMP_SYS(recvfrom),
      SCMP_SYS(recvmsg),      SCMP_SYS(rename),       SCMP_SYS(renameat),
      SCMP_SYS(renameat2),    SCMP_SYS(rmdir),        SCMP_SYS(rt_sigaction),
      SCMP_SYS(rt_sigprocmask), SCMP_SYS(rt_sigreturn), SCMP_SYS(sched_getaffinity),
      SCMP_SYS(sched_yield),  SCMP_SYS(sendmsg),      SCMP_SYS(sendto),
      SCMP_SYS(set_robust_list), SCMP_SYS(set_tid_address), SCMP_SYS(setsockopt),
      SCMP_SYS(shutdown),     SCMP_SYS(sigaltstack),  SCMP_SYS(socket),
      SCMP_SYS(socketpair),   SCMP_SYS(stat),         SCMP_SYS(statfs),
      SCMP_SYS(statx),        SCMP_SYS(symlinkat),    SCMP_SYS(sysinfo),
      SCMP_SYS(tgkill),       SCMP_SYS(time),         SCMP_SYS(unlink),
      SCMP_SYS(unlinkat),     SCMP_SYS(wait4),        SCMP_SYS(waitid),
      SCMP_SYS(write),        SCMP_SYS(writev),
  };

  for (size_t i = 0; i < sizeof(allowed_syscalls) / sizeof(allowed_syscalls[0]); i++) {
    if (seccomp_rule_add(ctx, SCMP_ACT_ALLOW, allowed_syscalls[i], 0) < 0) {
      fprintf(stderr, "installer-sandbox: failed to add seccomp rule: %s\n", strerror(errno));
      seccomp_release(ctx);
      return -1;
    }
  }

  if (seccomp_load(ctx) < 0) {
    fprintf(stderr, "installer-sandbox: failed to load seccomp filter: %s\n", strerror(errno));
    seccomp_release(ctx);
    return -1;
  }

  seccomp_release(ctx);
  return 0;
#else
  fprintf(stderr, "installer-sandbox: seccomp support was not compiled in\n");
  return -1;
#endif
}
