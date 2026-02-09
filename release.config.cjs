module.exports = {
  branches: ['main'],
  plugins: [
    ['@semantic-release/commit-analyzer', { preset: 'conventionalcommits' }],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        writerOpts: {
          committerDate: () => ''
        }
      }
    ],
    ['@semantic-release/npm', { pkgRoot: 'packages/springstack', npmPublish: false }],
    ['@semantic-release/exec', { publishCmd: 'cd packages/springstack && npm publish --access public --provenance' }],
    '@semantic-release/github'
  ]
};
