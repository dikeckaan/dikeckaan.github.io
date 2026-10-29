// Featured projects, hero stats and the repository explorer (data/repos.json).
(function () {
    'use strict';

    const USER = 'dikeckaan';
    const PAGE = 24;
    const FEATURED = 5;

    // For repos that have no GitHub description yet.
    const BLURBS = {
        'MacOS-Workflow-VNC': 'A free macOS desktop over VNC in about five minutes, running on GitHub Actions runners with an ngrok tunnel.',
        'OpenEUICC-5ber': 'OpenEUICC build with 5ber eSIM support: a free, open-source Local Profile Assistant for Android.',
        'flutter-sni-bughost-checker': 'Flutter app that checks a list of hosts for working HTTPS / SNI and keeps the ones that pass.',
    };

    // GitHub linguist colors for the languages that appear here.
    const COLORS = {
        Shell: '#89e051', Python: '#3572A5', C: '#555555', 'C++': '#f34b7d', 'C#': '#178600',
        HTML: '#e34c26', CSS: '#563d7c', JavaScript: '#f1e05a', TypeScript: '#3178c6', Kotlin: '#A97BFF',
        Java: '#b07219', Swift: '#F05138', Go: '#00ADD8', Dart: '#00B4AB', PHP: '#4F5D95', Ruby: '#701516',
        Vue: '#41b883', PowerShell: '#012456', Batchfile: '#C1F12E', AutoIt: '#1C3552', Rust: '#dea584',
        'Objective-C': '#438eff', Makefile: '#427819', Dockerfile: '#384d54', Lua: '#000080', SCSS: '#c6538c',
    };

    const ICON = {
        star: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z"/></svg>',
        fork: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="5" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><path d="M6 7v2a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7M12 12v5"/></svg>',
        clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
        law: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v18M5 21h14M5 7h14M7 7l-3 7a3 3 0 0 0 6 0zM17 7l-3 7a3 3 0 0 0 6 0z"/></svg>',
        link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>',
    };

    const $ = (s, el = document) => el.querySelector(s);
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const nf = new Intl.NumberFormat('en');
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '');

    function ago(iso) {
        const s = (new Date(iso) - Date.now()) / 1000;
        const steps = [[60, 'second'], [60, 'minute'], [24, 'hour'], [30, 'day'], [12, 'month'], [Infinity, 'year']];
        let v = s;
        for (const [n, unit] of steps) {
            if (Math.abs(v) < n) return rtf.format(Math.round(v), unit);
            v /= n;
        }
    }

    function describe(r) { return r.description || BLURBS[r.name] || ''; }

    function langMeta(r) {
        if (!r.language) return '';
        return `<span><i class="lang-dot" style="background:${COLORS[r.language] || 'var(--text-muted)'}"></i>${esc(r.language)}</span>`;
    }

    // ---------- data ----------

    async function loadSnapshot() {
        const res = await fetch('data/repos.json', { cache: 'no-cache' });
        if (!res.ok) throw new Error(res.status);
        return res.json();
    }

    // Used only if the snapshot is missing; the public API allows 60 calls an hour.
    async function loadLive() {
        const get = (p) => fetch(`https://api.github.com${p}`).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
        const user = await get(`/users/${USER}`);
        let all = [];
        for (let page = 1; page < 10; page++) {
            const batch = await get(`/users/${USER}/repos?type=owner&per_page=100&page=${page}`);
            all = all.concat(batch);
            if (batch.length < 100) break;
        }
        return {
            user: { followers: user.followers, public_repos: user.public_repos },
            repos: all.map((r) => ({
                name: r.name, description: r.description || '', url: r.html_url, homepage: r.homepage || '',
                language: r.language || '', stars: r.stargazers_count, forks: r.forks_count, issues: r.open_issues_count,
                fork: r.fork, archived: r.archived, topics: r.topics || [],
                license: r.license && r.license.spdx_id !== 'NOASSERTION' ? r.license.spdx_id : '',
                created: r.created_at, pushed: r.pushed_at,
            })),
        };
    }

    // ---------- stats + featured ----------

    function countUp(el, to) {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = nf.format(to); return; }
        const t0 = performance.now(), dur = 900;
        const tick = (t) => {
            const p = Math.min(1, (t - t0) / dur);
            el.textContent = nf.format(Math.round(to * (1 - Math.pow(1 - p, 3))));
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    function renderStats(data) {
        const own = data.repos.filter((r) => !r.fork);
        const values = {
            repos: data.repos.length,
            stars: own.reduce((a, r) => a + r.stars, 0),
            forks: own.reduce((a, r) => a + r.forks, 0),
            followers: data.user?.followers ?? 0,
        };
        for (const [k, v] of Object.entries(values)) countUp($(`[data-stat="${k}"]`), v);
    }

    function renderFeatured(repos) {
        const top = repos.filter((r) => !r.fork && !r.archived).sort((a, b) => b.stars - a.stars).slice(0, FEATURED);
        $('#featured-grid').innerHTML = top.map((r, i) => {
            const site = safeUrl(r.homepage);
            const meta = `<div class="card-meta">
                ${i ? `<span class="star">${ICON.star}${nf.format(r.stars)}</span>` : ''}
                <span>${ICON.fork}${nf.format(r.forks)}</span>
                ${langMeta(r)}
                <span class="upd">${ICON.clock}${esc(ago(r.pushed))}</span>
            </div>`;
            if (i === 0) {
                return `<article class="project-card spotlight">
                    <span class="spotlight-badge">★ Most starred</span>
                    <div class="spotlight-stars">${ICON.star}${nf.format(r.stars)}</div>
                    <h3>${esc(r.name)}</h3>
                    <p>${esc(describe(r))}</p>
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
                <p>${esc(describe(r)) || 'No description'}</p>
                ${meta}
            </a>`;
        }).join('');
    }

    // ---------- explorer ----------

    const DEFAULTS = { q: '', type: 'sources', lang: '', sort: 'stars', topic: '', site: false, view: 'grid' };
    const state = { ...DEFAULTS };
    let REPOS = [];
    let shown = PAGE;

    function readUrl() {
        const p = new URLSearchParams(location.search);
        for (const k of Object.keys(DEFAULTS)) {
            if (!p.has(k)) continue;
            state[k] = typeof DEFAULTS[k] === 'boolean' ? p.get(k) === '1' : p.get(k);
        }
        try { if (!p.has('view')) state.view = localStorage.getItem('view') || state.view; } catch (e) {}
    }

    function writeUrl() {
        const p = new URLSearchParams();
        for (const [k, v] of Object.entries(state)) {
            if (k === 'view' || v === DEFAULTS[k]) continue;
            p.set(k, typeof v === 'boolean' ? '1' : v);
        }
        const qs = p.toString();
        history.replaceState(null, '', (qs ? `?${qs}` : location.pathname) + location.hash);
    }

    function filtered() {
        const words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
        const list = REPOS.filter((r) => {
            if (state.type === 'sources' && r.fork) return false;
            if (state.type === 'forks' && !r.fork) return false;
            if (state.lang && (r.language || 'Other') !== state.lang) return false;
            if (state.topic && !r.topics.includes(state.topic)) return false;
            if (state.site && !safeUrl(r.homepage)) return false;
            if (words.length) {
                const hay = r._hay;
                if (!words.every((w) => hay.includes(w))) return false;
            }
            return true;
        });
        const by = {
            stars: (a, b) => b.stars - a.stars || b.forks - a.forks || b.pushed.localeCompare(a.pushed),
            forks: (a, b) => b.forks - a.forks || b.stars - a.stars,
            pushed: (a, b) => b.pushed.localeCompare(a.pushed),
            created: (a, b) => b.created.localeCompare(a.created),
            oldest: (a, b) => a.created.localeCompare(b.created),
            name: (a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }),
        }[state.sort] || (() => 0);
        return list.sort(by);
    }

    function repoCard(r) {
        const site = safeUrl(r.homepage);
        const desc = describe(r);
        return `<article class="repo-card">
            <div class="repo-head">
                <h3><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a></h3>
                <span class="repo-flags">${r.fork ? '<span class="repo-flag">fork</span>' : ''}${r.archived ? '<span class="repo-flag archived">archived</span>' : ''}</span>
            </div>
            <p class="${desc ? '' : 'empty-desc'}">${desc ? esc(desc) : 'No description'}</p>
            ${r.topics.length ? `<div class="repo-topics">${r.topics.slice(0, 6).map((t) => `<button type="button" class="repo-topic" data-topic="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}
            <div class="card-meta">
                ${langMeta(r)}
                <span class="star">${ICON.star}${nf.format(r.stars)}</span>
                <span>${ICON.fork}${nf.format(r.forks)}</span>
                ${r.license ? `<span class="lic">${ICON.law}${esc(r.license)}</span>` : ''}
                <span class="upd" title="${esc(new Date(r.pushed).toLocaleString())}">${ICON.clock}${esc(ago(r.pushed))}</span>
                ${site ? `<a href="${esc(site)}" target="_blank" rel="noopener" title="${esc(site)}">${ICON.link} website</a>` : ''}
            </div>
        </article>`;
    }

    // Language chips count within the current type/topic/site filters, so the numbers match what a click would show.
    function renderLangs() {
        const base = REPOS.filter((r) =>
            !(state.type === 'sources' && r.fork) && !(state.type === 'forks' && !r.fork) &&
            !(state.topic && !r.topics.includes(state.topic)) && !(state.site && !safeUrl(r.homepage)));
        const counts = new Map();
        for (const r of base) counts.set(r.language || 'Other', (counts.get(r.language || 'Other') || 0) + 1);
        const langs = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
        if (state.lang && !counts.has(state.lang)) langs.push([state.lang, 0]);

        $('#langbar').innerHTML = [`<button type="button" class="lang-chip" data-lang="" aria-pressed="${!state.lang}">All <span class="n">${base.length}</span></button>`]
            .concat(langs.map(([l, n]) => `<button type="button" class="lang-chip" data-lang="${esc(l)}" aria-pressed="${state.lang === l}">
                <i class="lang-dot" style="background:${COLORS[l] || 'var(--text-muted)'}"></i>${esc(l)} <span class="n">${n}</span></button>`)).join('');
    }

    function render() {
        const list = filtered();
        const grid = $('#repo-grid');
        grid.className = `repo-grid${state.view === 'list' ? ' list' : ''}`;
        grid.innerHTML = list.slice(0, shown).map(repoCard).join('');

        $('#count').textContent = `${nf.format(list.length)} ${list.length === 1 ? 'repository' : 'repositories'}`;
        $('#empty').hidden = list.length > 0;
        const more = $('#more');
        const left = list.length - shown;
        more.hidden = left <= 0;
        if (left > PAGE) more.innerHTML = `Show ${PAGE} more <span class="muted">· ${nf.format(left)} left</span>`;
        else if (left > 0) more.textContent = `Show the last ${nf.format(left)}`;

        const pills = [];
        if (state.q) pills.push(['q', `“${state.q}”`]);
        if (state.lang) pills.push(['lang', state.lang]);
        if (state.topic) pills.push(['topic', `#${state.topic}`]);
        if (state.site) pills.push(['site', 'has website']);
        $('#active-filters').innerHTML = pills.map(([k, label]) =>
            `<span class="filter-pill">${esc(label)}<button type="button" data-unset="${k}" aria-label="Remove filter ${esc(label)}">×</button></span>`).join(' ');
        const dirty = Object.keys(DEFAULTS).some((k) => k !== 'view' && state[k] !== DEFAULTS[k]);
        $('#clear').hidden = !dirty;

        for (const b of document.querySelectorAll('#type button')) b.setAttribute('aria-checked', b.dataset.v === state.type);
        for (const b of document.querySelectorAll('#view button')) b.setAttribute('aria-checked', b.dataset.v === state.view);
        $('#sort').value = state.sort;
        $('#has-site').checked = state.site;
        if ($('#q').value !== state.q) $('#q').value = state.q;
        renderLangs();
        writeUrl();
    }

    function update(patch) {
        Object.assign(state, patch);
        shown = PAGE;
        render();
    }

    function clearAll() {
        update({ ...DEFAULTS, view: state.view });
    }

    function bind() {
        let t;
        $('#q').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => update({ q: e.target.value.trim() }), 120); });
        $('#type').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) update({ type: b.dataset.v }); });
        $('#view').addEventListener('click', (e) => {
            const b = e.target.closest('button'); if (!b) return;
            try { localStorage.setItem('view', b.dataset.v); } catch (err) {}
            state.view = b.dataset.v; render();
        });
        $('#sort').addEventListener('change', (e) => update({ sort: e.target.value }));
        $('#has-site').addEventListener('change', (e) => update({ site: e.target.checked }));
        $('#langbar').addEventListener('click', (e) => { const b = e.target.closest('.lang-chip'); if (b) update({ lang: b.dataset.lang === state.lang ? '' : b.dataset.lang }); });
        $('#repo-grid').addEventListener('click', (e) => {
            const b = e.target.closest('.repo-topic'); if (!b) return;
            // A topic usually lives on our own repos; show forks too so nothing is hidden.
            update({ topic: b.dataset.topic, type: state.type === 'forks' ? 'all' : state.type });
            $('#repos').scrollIntoView({ behavior: 'smooth' });
        });
        $('#active-filters').addEventListener('click', (e) => { const b = e.target.closest('[data-unset]'); if (b) update({ [b.dataset.unset]: DEFAULTS[b.dataset.unset] }); });
        $('#clear').addEventListener('click', clearAll);
        $('[data-clear]').addEventListener('click', clearAll);
        $('#more').addEventListener('click', () => { shown += PAGE; render(); });

        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
                e.preventDefault();
                $('#repos').scrollIntoView({ behavior: 'smooth' });
                $('#q').focus({ preventScroll: true });
            } else if (e.key === 'Escape' && document.activeElement === $('#q')) {
                update({ q: '' });
            }
        });
    }

    // ---------- chrome ----------

    function initFab() {
        const fab = $('.sponsor-fab'), support = $('#support');
        const onScroll = () => {
            // Shows after the hero and steps aside while the support section is on screen.
            const r = support.getBoundingClientRect();
            const supportVisible = r.top < innerHeight && r.bottom > 0;
            fab.classList.toggle('show', scrollY > innerHeight * 0.6 && !supportVisible);
        };
        addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    async function main() {
        initFab();
        readUrl();
        bind();

        let data;
        try { data = await loadSnapshot(); } catch (e) {
            try { data = await loadLive(); } catch (err) {
                $('#featured-grid').innerHTML = `<p class="section-subtitle">Couldn't load projects right now. <a class="text-btn" href="https://github.com/${USER}?tab=repositories">Browse them on GitHub ↗</a></p>`;
                $('#count').textContent = '';
                return;
            }
        }
        REPOS = data.repos.map((r) => ({ ...r, _hay: [r.name, describe(r), r.language, ...(r.topics || [])].join(' ').toLowerCase() }));
        if (data.generated) $('#generated').textContent = ` · last update ${ago(data.generated)}`;
        renderStats(data);
        renderFeatured(REPOS);
        render();
    }

    main();
})();
