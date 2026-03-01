// Configuration for bug bounty tracker

export const CONFIG = {
  // GitHub repository
  repo: {
    owner: 'arkadiyt',
    name: 'bounty-targets-data',
  },

  // Data file paths in the repository
  files: {
    domains_txt: 'domains.txt',
    hackerone: 'data/hackerone_data.json',
    bugcrowd: 'data/bugcrowd_data.json',
    intigriti: 'data/intigriti_data.json',
    yeswehack: 'data/yeswehack_data.json',
  },

  // Local paths (resolved at runtime via PAI_DIR)
  paths: {
    root: `${process.env.PAI_DIR || (process.env.HOME + '/.claude')}/skills/hacking/bug-bounties`,
    state: `${process.env.PAI_DIR || (process.env.HOME + '/.claude')}/skills/hacking/bug-bounties/state.json`,
    cache: `${process.env.PAI_DIR || (process.env.HOME + '/.claude')}/skills/hacking/bug-bounties/cache`,
    logs: `${process.env.PAI_DIR || (process.env.HOME + '/.claude')}/skills/hacking/bug-bounties/logs`,
  },

  // GitHub API
  api: {
    base: 'https://api.github.com',
    raw_base: 'https://raw.githubusercontent.com',
  },

  // Cache settings
  cache: {
    max_age_days: 30,
    metadata_file: 'programs_metadata.json',
    recent_changes_file: 'recent_changes.json',
  },
} as const;
