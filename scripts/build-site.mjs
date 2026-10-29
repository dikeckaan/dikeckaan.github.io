// Writes everything crawlers and AI assistants read, from data/repos.json:
//   index.html     pre-rendered stats, featured projects, first page of repos, JSON-LD
//   projects.html  every project of mine on one static page
//   llms.txt, llms-full.txt  plain-text summaries (https://llmstxt.org)
//   sitemap.xml
// projects.js still takes over in the browser; this only makes the same content
// visible without JavaScript. Run after scripts/fetch-repos.mjs.
import { readFile, writeFile } from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);
const SITE = 'https://kaandikec.com';
const NAME = 'Abdurrahman Kaan Dikeç';
const SHORT = 'Kaan Dikeç';
const PAGE = 24;
const FEATURED = 5;
const SOCIAL = {
  GitHub: 'https://github.com/dikeckaan',
  'X / Twitter': 'https://twitter.com/kaandikec',
  Instagram: 'https://instagram.com/kaandikec',
  Telegram: 'https://t.me/kaandikec',
  'GitHub Sponsors': 'https://github.com/sponsors/dikeckaan',
};
const COLORS = {
  Shell: '#89e051', Python: '#3572A5', C: '#555555', 'C++': '#f34b7d', 'C#': '#178600', HTML: '#e34c26', CSS: '#563d7c',
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Kotlin: '#A97BFF', Java: '#b07219', Swift: '#F05138', Go: '#00ADD8',
  Dart: '#00B4AB', PHP: '#4F5D95', Ruby: '#701516', Vue: '#41b883', PowerShell: '#012456', Batchfile: '#C1F12E',
  AutoIt: '#1C3552', Rust: '#dea584', 'Objective-C': '#438eff', Makefile: '#427819', Dockerfile: '#384d54', Lua: '#000080', SCSS: '#c6538c',
};
// Sections of projects.html, first match wins.
const GROUPS = [
  ['ZTE F50 / MU300 / U30 and 5G modems', /zte|f50|mu300|u30|mu5358|magisk|dikec-control|mf286|mf910|ums9620|euicc|sim/i],
  ['macOS, iOS and Hackintosh', /mac|hackintosh|opencore|vphone|z590|tomahawk|ios/i],
  ['Android', /android|gsi|kotlin|apk|sienna/i],
  ['Networking, VPN and servers', /vpn|xray|v2ray|sni|warp|proxy|cloudflare|worker|tunnel|internet|net|rdp|vnc|ssh|kms/i],
];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = new Intl.NumberFormat('en');
const month = (iso) => new Date(iso).toLocaleDateString('en', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '');

const STAR = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z"/></svg>';
const FORK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="5" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><path d="M6 7v2a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7M12 12v5"/></svg>';
const CLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
const LINK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>';

const data = JSON.parse(await readFile(new URL('data/repos.json', ROOT), 'utf8'));
const repos = data.repos;
const own = repos.filter((r) => !r.fork);
const byStars = (a, b) => b.stars - a.stars || b.forks - a.forks || b.pushed.localeCompare(a.pushed);
const featured = own.filter((r) => !r.archived).sort(byStars).slice(0, FEATURED);
const totals = {
  repos: repos.length,
  stars: own.reduce((a, r) => a + r.stars, 0),
  forks: own.reduce((a, r) => a + r.forks, 0),
  followers: data.user?.followers ?? 0,
};
const today = (data.generated || new Date().toISOString()).slice(0, 10);

// ---------- HTML fragments (same markup projects.js renders) ----------

const lang = (r) => (r.language ? `<span><i class="lang-dot" style="background:${COLORS[r.language] || 'var(--text-muted)'}"></i>${esc(r.language)}</span>` : '');

function featuredHtml() {
  return featured.map((r, i) => {
    const site = safeUrl(r.homepage);
    const meta = `<div class="card-meta">${i ? `<span class="star">${STAR}${nf.format(r.stars)}</span>` : ''}<span>${FORK}${nf.format(r.forks)}</span>${lang(r)}<span class="upd">${CLOCK}Updated ${month(r.pushed)}</span></div>`;
    if (i === 0) {
      return `<article class="project-card spotlight">
                <span class="spotlight-badge">★ Most starred</span>
                <div class="spotlight-stars">${STAR}${nf.format(r.stars)}</div>
                <h3>${esc(r.name)}</h3>
                <p>${esc(r.description)}</p>
                ${meta}
                <div class="spotlight-actions">
                    <a class="btn btn-primary" href="${esc(r.url)}" target="_blank" rel="noopener">View on GitHub</a>
                    ${site ? `<a class="btn btn-ghost" href="${esc(site)}" target="_blank" rel="noopener">Website ↗</a>` : ''}
                </div>
            </article>`;
    }
    return `<a class="project-card" href="${esc(r.url)}" target="_blank" rel="noopener">
                <span class="project-rank">#${i + 1}</span>
                <h3>${esc(r.name)}</h3>
                <p>${esc(r.description) || 'No description'}</p>
                ${meta}
            </a>`;
  }).join('\n            ');
}

function repoCard(r, { topicButtons = true } = {}) {
  const site = safeUrl(r.homepage);
  const topics = r.topics.slice(0, 6).map((t) => (topicButtons
    ? `<button type="button" class="repo-topic" data-topic="${esc(t)}">${esc(t)}</button>`
    : `<span class="repo-topic">${esc(t)}</span>`)).join('');
  return `<article class="repo-card">
                <div class="repo-head">
                    <h3><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a></h3>
                    <span class="repo-flags">${r.fork ? '<span class="repo-flag">fork</span>' : ''}${r.archived ? '<span class="repo-flag archived">archived</span>' : ''}</span>
                </div>
                <p class="${r.description ? '' : 'empty-desc'}">${r.description ? esc(r.description) : 'No description'}</p>
                ${topics ? `<div class="repo-topics">${topics}</div>` : ''}
                <div class="card-meta">${lang(r)}<span class="star">${STAR}${nf.format(r.stars)}</span><span>${FORK}${nf.format(r.forks)}</span>${r.license ? `<span class="lic">${esc(r.license)}</span>` : ''}<span class="upd">${CLOCK}Updated ${month(r.pushed)}</span>${site ? `<a href="${esc(site)}" target="_blank" rel="noopener">${LINK} website</a>` : ''}</div>
            </article>`;
}

// ---------- JSON-LD ----------

function jsonLd() {
  const person = {
    '@type': 'Person',
    '@id': `${SITE}/#person`,
    name: NAME,
    alternateName: ['Kaan Dikeç', 'Kaan Dikec', 'Abdurrahman Kaan Dikec', 'dikeckaan', 'kaandikec'],
    givenName: 'Abdurrahman Kaan',
    familyName: 'Dikeç',
    jobTitle: 'Computer Engineer',
    description: 'Computer engineer from Istanbul building mu300-linux (Linux on the ZTE F50 / MU300 / U30 Air 5G hotspots), Magisk modules for rooted Android and native macOS tools.',
    url: `${SITE}/`,
    image: 'https://avatars.githubusercontent.com/u/21171681?s=460&v=4',
    email: 'mailto:site@kaandikec.org',
    address: { '@type': 'PostalAddress', addressLocality: 'Istanbul', addressCountry: 'TR' },
    nationality: { '@type': 'Country', name: 'Türkiye' },
    knowsAbout: ['Embedded Linux', 'Linux kernel', 'OpenWrt', 'Ubuntu', 'Android', 'Magisk', 'ZTE F50', 'ZTE MU300', 'ZTE U30 Air', 'Unisoc UMS9620', '5G modems', 'macOS', 'Swift', 'Hackintosh', 'VPN', 'Xray', 'WireGuard', 'Networking', 'Shell scripting', 'Python', 'Kotlin', 'TypeScript', 'Music'],
    sameAs: Object.values(SOCIAL).filter((u) => !u.includes('sponsors')),
  };
  const graph = [
    person,
    {
      '@type': 'WebSite',
      '@id': `${SITE}/#website`,
      url: `${SITE}/`,
      name: SHORT,
      description: 'Personal website and project portfolio of Abdurrahman Kaan Dikeç.',
      inLanguage: 'en',
      publisher: { '@id': `${SITE}/#person` },
    },
    {
      '@type': 'ProfilePage',
      '@id': `${SITE}/#profile`,
      url: `${SITE}/`,
      name: `${SHORT} — Developer & Engineer`,
      isPartOf: { '@id': `${SITE}/#website` },
      about: { '@id': `${SITE}/#person` },
      mainEntity: { '@id': `${SITE}/#person` },
      dateModified: data.generated,
    },
    {
      '@type': 'ItemList',
      '@id': `${SITE}/#projects`,
      name: 'Most-starred open-source projects',
      itemListOrder: 'https://schema.org/ItemListOrderDescending',
      itemListElement: own.filter((r) => !r.archived).sort(byStars).slice(0, 10).map((r, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'SoftwareSourceCode',
          name: r.name,
          description: r.description || undefined,
          codeRepository: r.url,
          url: safeUrl(r.homepage) || r.url,
          programmingLanguage: r.language || undefined,
          license: r.license ? `https://spdx.org/licenses/${r.license}.html` : undefined,
          keywords: r.topics.length ? r.topics.join(', ') : undefined,
          author: { '@id': `${SITE}/#person` },
          dateCreated: r.created,
          dateModified: r.pushed,
          interactionStatistic: { '@type': 'InteractionCounter', interactionType: 'https://schema.org/LikeAction', userInteractionCount: r.stars },
        },
      })),
    },
  ];
  // </script> can't appear in JSON strings that come from repo descriptions.
  return `<script type="application/ld+json">\n${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2).replace(/</g, '\\u003c')}\n    </script>`;
}

// ---------- index.html ----------

function block(text, name, body) {
  const re = new RegExp(`(<!-- ${name}:START -->)[\\s\\S]*?(<!-- ${name}:END -->)`);
  if (!re.test(text)) throw new Error(`marker ${name} missing`);
  return text.replace(re, `$1\n${body}\n$2`);
}

let index = await readFile(new URL('index.html', ROOT), 'utf8');
index = block(index, 'JSONLD', `    ${jsonLd()}`);
index = block(index, 'FEATURED', `            ${featuredHtml()}`);
index = block(index, 'REPOS', `            ${own.slice().sort(byStars).slice(0, PAGE).map((r) => repoCard(r)).join('\n            ')}`);
index = index.replace(/(<span id="count" aria-live="polite">)[\s\S]*?(<\/span>)/, `$1${nf.format(own.length)} repositories$2`);
for (const [k, v] of Object.entries(totals)) {
  index = index.replace(new RegExp(`(<dd data-stat="${k}">)[^<]*(</dd>)`), `$1${nf.format(v)}$2`);
}
await writeFile(new URL('index.html', ROOT), index);

// ---------- projects.html ----------

function groupOf(r) {
  const hay = `${r.name} ${r.description} ${r.topics.join(' ')}`;
  for (const [title, re] of GROUPS) if (re.test(hay)) return title;
  return 'More projects';
}

const groups = new Map([...GROUPS.map(([t]) => [t, []]), ['More projects', []]]);
for (const r of own.slice().sort(byStars)) groups.get(groupOf(r)).push(r);
const sections = [...groups].filter(([, list]) => list.length).map(([title, list], gi) => `
        <section class="repos">
            <div class="section-header">
                <span class="section-number">${String(gi + 1).padStart(2, '0')}</span>
                <h2>${esc(title)}</h2>
            </div>
            <div class="repo-grid">
            ${list.map((r) => repoCard(r, { topicButtons: false })).join('\n            ')}
            </div>
        </section>`).join('\n');

const projectsLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': `${SITE}/projects.html`,
  url: `${SITE}/projects.html`,
  name: `All projects by ${SHORT}`,
  isPartOf: { '@id': `${SITE}/#website` },
  about: { '@id': `${SITE}/#person` },
  dateModified: data.generated,
  mainEntity: {
    '@type': 'ItemList',
    numberOfItems: own.length,
    itemListElement: own.slice().sort(byStars).map((r, i) => ({ '@type': 'ListItem', position: i + 1, url: r.url, name: r.name })),
  },
};

const projectsPage = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Generated by scripts/build-site.mjs from data/repos.json. Don't edit by hand. -->
    <title>All projects by ${SHORT} — ${own.length} open-source repositories</title>
    <meta name="description" content="Every open-source project by ${NAME}: mu300-linux and tools for the ZTE F50 / MU300 / U30 Air 5G hotspots, Magisk modules, macOS apps, Hackintosh EFIs, VPN and networking tools.">
    <meta name="author" content="${NAME}">
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
    <meta name="theme-color" content="#0a0a0a">
    <link rel="canonical" href="${SITE}/projects.html">
    <link rel="icon" href="https://avatars.githubusercontent.com/u/21171681?s=64&v=4">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${SHORT}">
    <meta property="og:url" content="${SITE}/projects.html">
    <meta property="og:title" content="All projects by ${SHORT}">
    <meta property="og:description" content="${own.length} open-source repositories: embedded Linux, Magisk modules, macOS tools and more.">
    <meta property="og:image" content="${SITE}/images/og.png">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@kaandikec">
    <link rel="stylesheet" href="style.css">
    <script type="application/ld+json">
${JSON.stringify(projectsLd, null, 2).replace(/</g, '\\u003c')}
    </script>
</head>
<body>
    <div class="animated-bg">
        <div class="gradient-orb orb-1"></div>
        <div class="gradient-orb orb-2"></div>
        <div class="gradient-orb orb-3"></div>
    </div>

    <div class="container">
        <section class="hero">
            <a class="hero-badge" href="/">← kaandikec.com</a>
            <h1>All Projects</h1>
            <p class="tagline">${nf.format(own.length)} open-source repositories by ${NAME}</p>
            <p class="subtitle">${nf.format(totals.stars)} stars · ${nf.format(totals.forks)} forks · updated ${month(today)}. Want to search and filter? Use the <a class="text-btn" href="/#repos">repository explorer</a>.</p>
            <div class="hero-actions">
                <a href="https://github.com/dikeckaan?tab=repositories" target="_blank" rel="noopener" class="btn btn-primary">GitHub profile</a>
                <a href="https://github.com/sponsors/dikeckaan" target="_blank" rel="noopener" class="btn btn-sponsor">♥ Sponsor</a>
            </div>
        </section>
${sections}

        <footer>
            <div class="footer-content">
                <p>&copy; ${today.slice(0, 4)} ${NAME}. <a class="text-btn" href="/">Home</a> · <a class="text-btn" href="/#contact">Contact</a></p>
                <p class="footer-tagline">Generated daily from the GitHub API · public repositories only</p>
            </div>
        </footer>
    </div>
</body>
</html>
`;
await writeFile(new URL('projects.html', ROOT), projectsPage);

// ---------- llms.txt ----------

const line = (r) => `- [${r.name}](${r.url})${r.description ? `: ${r.description}` : ''}${safeUrl(r.homepage) ? ` (website: ${r.homepage})` : ''}`;
const about = `${NAME} (also written Kaan Dikeç or Kaan Dikec; GitHub: dikeckaan) is a computer engineer, developer and musician from Istanbul, Türkiye. Most of his work is close to the hardware: he created mu300-linux, which runs a full Ubuntu or OpenWrt next to Android on the ZTE F50, MU300 and U30 Air 5G hotspots (Unisoc T760 / UMS9620), together with a flashing toolkit, a VPN module and a family of Magisk modules for those devices. He also builds native macOS apps (easy-vphone), Hackintosh EFIs, a Forza Horizon telemetry dashboard and networking / VPN tools. Almost all of it is open source on GitHub.`;

const llms = `# ${SHORT}

> ${about}

Numbers as of ${today}: ${nf.format(own.length)} original public repositories (${nf.format(repos.length)} including forks), ${nf.format(totals.stars)} stars and ${nf.format(totals.forks)} forks on his own repositories, ${nf.format(totals.followers)} GitHub followers.

## Most-starred projects

${own.filter((r) => !r.archived).sort(byStars).slice(0, 12).map((r) => `${line(r)} (${nf.format(r.stars)} stars)`).join('\n')}

## Pages

- [Home](${SITE}/): about, featured projects, searchable repository list, contact form
- [All projects](${SITE}/projects.html): every original repository, grouped by topic
- [Full text for LLMs](${SITE}/llms-full.txt): every repository with language, stars, topics and dates
- [VLESS to Xray converter](${SITE}/simplexray.html): turns a VLESS share link into an Xray client config
- [mu300-linux web installer](${SITE}/mu300-linux/)
- [Forza Horizon 6 telemetry dashboard](${SITE}/forza-horizon-6-telemetry-dashboard/)

## Contact

${Object.entries(SOCIAL).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
- Email: site@kaandikec.org
`;
await writeFile(new URL('llms.txt', ROOT), llms);

const full = `${llms}
## Every original repository

${[...groups].filter(([, l]) => l.length).map(([title, list]) => `### ${title}

${list.map((r) => `#### ${r.name}
- URL: ${r.url}${safeUrl(r.homepage) ? `\n- Website: ${r.homepage}` : ''}
- Description: ${r.description || '(none)'}
- Language: ${r.language || 'n/a'} · Stars: ${r.stars} · Forks: ${r.forks}${r.license ? ` · License: ${r.license}` : ''}${r.archived ? ' · Archived' : ''}
- Topics: ${r.topics.length ? r.topics.join(', ') : 'none'}
- Created: ${r.created.slice(0, 10)} · Last push: ${r.pushed.slice(0, 10)}`).join('\n\n')}`).join('\n\n')}

## Forks

Repositories forked from other projects (not his own work): ${repos.filter((r) => r.fork).map((r) => r.name).join(', ')}.
`;
await writeFile(new URL('llms-full.txt', ROOT), full);

// ---------- sitemap.xml ----------

const urls = [
  [`${SITE}/`, today, 'daily', '1.0'],
  [`${SITE}/projects.html`, today, 'daily', '0.9'],
  [`${SITE}/simplexray.html`, null, 'monthly', '0.5'],
  [`${SITE}/mu300-linux/`, null, 'weekly', '0.8'],
  [`${SITE}/forza-horizon-6-telemetry-dashboard/`, null, 'monthly', '0.6'],
];
await writeFile(new URL('sitemap.xml', ROOT), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([loc, mod, freq, pri]) => `  <url>
    <loc>${loc}</loc>${mod ? `\n    <lastmod>${mod}</lastmod>` : ''}
    <changefreq>${freq}</changefreq>
    <priority>${pri}</priority>
  </url>`).join('\n')}
</urlset>
`);

console.log(`built: ${featured.length} featured, ${own.length} projects in ${groups.size} groups`);
