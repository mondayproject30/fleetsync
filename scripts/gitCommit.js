import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import fs from 'fs';
import path from 'path';

const dir = process.cwd();

async function walkDir(currentDir, relativePath = '') {
  const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const resPath = path.join(currentDir, entry.name);
    const rel = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    // Skip node_modules, dist, .git
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...await walkDir(resPath, rel));
    } else {
      files.push(rel);
    }
  }
  return files;
}

async function main() {
  console.log('1. Initializing Git repository...');
  await git.init({ fs, dir, defaultBranch: 'main' });

  console.log('2. Scanning repository files...');
  const files = await walkDir(dir);
  console.log(`Found ${files.length} project files to stage.`);

  console.log('3. Staging files...');
  for (const filepath of files) {
    await git.add({ fs, dir, filepath });
  }

  console.log('4. Creating commit...');
  const sha = await git.commit({
    fs,
    dir,
    message: 'FleetSync v1.3: Edge-AI Warehouse AMR Fleet Coordination Simulator (Bilateral Evasion, 3-Lane Navigation, Resource Locking)',
    author: {
      name: 'Mithulesh314',
      email: 'mithulesh@example.com',
    },
  });
  console.log('Committed successfully with SHA:', sha);

  console.log('5. Configuring remote...');
  await git.setConfig({
    fs,
    dir,
    path: 'remote.origin.url',
    value: 'https://github.com/mondayproject30/fleetsync.git',
  });

  console.log('Repository setup and committed successfully!');
}

main().catch(err => {
  console.error('Git error:', err);
  process.exit(1);
});
