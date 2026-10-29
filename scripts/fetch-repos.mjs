// Builds data/repos.json from the public GitHub API: the profile and every
// public repository of the user, slimmed down to what the site renders.
// Run by .github/workflows/update-repos.yml; GITHUB_TOKEN only raises the rate limit.
import { writeFile } from 'node:fs/promises';

const USER = process.env.GH_USER || 'dikeckaan';
const OUT = new URL('../data/repos.json', import.meta.url);
const headers = { Accept: 'application/vnd.github+json', 'User-Agent': `${USER}-site` };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function get(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

const u = await get(`/users/${USER}`);
const repos = [];
for (let page = 1; ; page++) {
  const batch = await get(`/users/${USER}/repos?type=owner&per_page=100&page=${page}`);
  repos.push(...batch);
  if (batch.length < 100) break;
}

const slim = repos
  .filter((r) => !r.private)
  .map((r) => ({
    name: r.name,
    description: r.description || '',
    url: r.html_url,
    homepage: r.homepage || '',
    language: r.language || '',
    stars: r.stargazers_count,
    forks: r.forks_count,
    issues: r.open_issues_count,
    fork: r.fork,
    archived: r.archived,
    topics: r.topics || [],
    license: r.license?.spdx_id && r.license.spdx_id !== 'NOASSERTION' ? r.license.spdx_id : '',
    created: r.created_at,
    pushed: r.pushed_at,
  }))
  .sort((a, b) => b.stars - a.stars || b.pushed.localeCompare(a.pushed));

const data = {
  generated: new Date().toISOString(),
  user: {
    login: u.login,
    name: u.name,
    bio: u.bio,
    avatar: u.avatar_url,
    location: u.location,
    followers: u.followers,
    public_repos: u.public_repos,
  },
  repos: slim,
};
await writeFile(OUT, JSON.stringify(data, null, 1) + '\n');
console.log(`wrote ${slim.length} repos`);
