import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import fs from 'fs';

const dir = process.cwd();

async function main() {
  console.log('Attempting git push to https://github.com/mondayproject30/fleetsync.git ...');

  const pushResult = await git.push({
    fs,
    http,
    dir,
    remote: 'origin',
    ref: 'main',
    onAuth: () => {
      // Check if environment token exists
      const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
      if (token) {
        return { username: token };
      }
      return undefined;
    },
  });

  console.log('Push result:', pushResult);
}

main().catch(err => {
  console.error('Push error:', err.message || err);
  process.exit(1);
});
