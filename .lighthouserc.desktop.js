module.exports = {
  ci: {
    collect: {
      puppeteerScript: './scripts/lighthouse-login.js',
      numberOfRuns: 1,
      settings: {
        preset: 'desktop',
      },
    },
  },
}
