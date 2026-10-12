// OpenNext build config, read by the SST build (sst.config.ts).
//
// @libsql/client loads a native binary for the build machine's platform, so a
// bundle built on a Mac has only the darwin one and fails on Lambda with
// "Cannot find module '@libsql/linux-x64-gnu'". Install the Linux build into
// the server bundle; keep the version equal to node_modules/libsql's.
export default {
  default: {
    install: {
      packages: ['@libsql/linux-x64-gnu@0.5.29'],
      arch: 'x64',
      libc: 'glibc',
      // npm refuses a package named outright for another CPU/OS (the --cpu/--os
      // flags only steer optional deps); --force installs it anyway.
      additionalArgs: '--force',
    },
  },
};
