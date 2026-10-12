// OpenNext build config, read by the SST build (sst.config.ts).
//
// @libsql/client loads a native binary for the build machine's platform, so a
// bundle built on a Mac has only the darwin one and fails on Lambda with
// "Cannot find module '@libsql/linux-x64-gnu'". Install the Linux build into
// the server bundle; keep the version equal to node_modules/libsql's.
//
// The compressed wrapper gzips/brotlis the response inside Lambda. A buffered
// Lambda response is capped at 6 MB, and /api/sync is the whole dataset —
// already 2.7 MB for the owner — so it must leave Lambda compressed, not
// only at CloudFront. (BROTLI_QUALITY is set in sst.config.ts: unset, the
// wrapper's own default comes out as NaN.)
const config = {
  default: {
    override: {
      wrapper: 'aws-lambda-compressed',
    },
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

export default config;
