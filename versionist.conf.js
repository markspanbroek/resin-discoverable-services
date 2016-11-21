module.exports = {

  // This setup allows the editing and parsing of footer tags to get version and type information,
  // as well as ensuring tags of the type 'v<major>.<minor>.<patch>' are used.
  // It increments in a semver compatible fashion and allows the updating of NPM package info.
  editChangelog: true,
  parseFooterTags: true,
  getGitReferenceFromVersion: 'v-prefix',
  incrementVersion: 'semver',
  updateVersion: 'npm',

  // Determine the type from 'Change-Type:' tag.
  // Should no explicit change type be made, then patch is assumed.
  getIncrementLevelFromCommit: (commit) => {
    if (commitType = commit.footer['Change-Type']) {
      return commit.footer['Change-Type'].trim();
    }
    return 'patch';
  },

  // Determine if an issue number is included from a 'Connects-To' tag.
  // This is highly preferable, but not (yet) mandatory.
  transformTemplateData: (data) => {
    var trackerURL = 'https://github.com/resin-io-modules/resin-discoverable-services/issues/';

    data.commits.forEach((commit) => {
      if (commit.footer['Connects-To']) {
        // Ensure it's a valid number.
        if (issue = commit.footer['Connects-To'].trim().match(/^#[0-9]+$/)) {
          commit.issue = trackerURL + issue[0].substring(1);
        }
      }
    });

    return data;
  },

  template: [
    '# v{{version}}',
    '',
    '{{#each commits}}',
    '{{#if this.issue}}',
    '* {{capitalize this.subject}} - ({{this.issue}})',
    '{{else}}',
    '* {{capitalize this.subject}}',
    '{{/if}}',
    '{{/each}}'
  ].join('\n')
};
