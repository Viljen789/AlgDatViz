// Phase 4 visual QA: capture every topic page (hero + a scrolled view) at a
// single desktop viewport for a cross-topic consistency review.
//   node scripts/qa-capture.mjs   (with `pnpm dev` running)
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'test-results', 'qa');
const BASE = process.env.BASE_URL || 'http://localhost:5173';
const THEME = process.env.PW_THEME || 'dark';
const VW = Number(process.env.PW_W) || 1440;
const VH = Number(process.env.PW_H) || 900;
const LABEL = process.env.PW_LABEL ? `-${process.env.PW_LABEL}` : '';

const PAGES = [
	{ path: '/', name: '00-home' },
	{ path: '/lessons/merge-sort', name: '01-sorting' },
	{ path: '/stacks-queues', name: '02-stacks-queues' },
	{ path: '/master-theorem', name: '03-master' },
	{ path: '/hashmap', name: '04-hashing' },
	{ path: '/tree', name: '05-trees' },
	{ path: '/graph', name: '06-graphs' },
	{ path: '/strategies', name: '07-strategies' },
	{ path: '/linear-time-sorting', name: '09-linsort' },
	{ path: '/heaps', name: '10-heaps' },
	{ path: '/mst', name: '11-mst' },
	{ path: '/shortest-paths', name: '12-sssp' },
	{ path: '/all-pairs-shortest-paths', name: '13-apsp' },
	{ path: '/max-flow', name: '14-maxflow' },
	{ path: '/np-completeness', name: '15-npc' },
	{ path: '/styleguide', name: '08-styleguide' },
];

await mkdir(OUT, { recursive: true });
const EXE =
	process.env.PW_CHROMIUM ||
	'/Users/viljen/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const browser = await chromium.launch({ executablePath: EXE });
try {
	const context = await browser.newContext({
		viewport: { width: VW, height: VH },
		deviceScaleFactor: 1,
		colorScheme: THEME,
	});
	const page = await context.newPage();
	// fresh progress state; pin the theme under test
	await page.goto(BASE + '/');
	await page.evaluate(t => {
		window.localStorage.clear();
		window.localStorage.setItem('algdatviz:theme', t);
	}, THEME);

	for (const cfg of PAGES) {
		await page.goto(BASE + cfg.path, { waitUntil: 'networkidle' });
		await page.waitForTimeout(700);
		await page.screenshot({ path: resolve(OUT, `${cfg.name}-${THEME}${LABEL}-top.png`), fullPage: false });

		// scroll the largest scroll container to reveal the concept/stage
		const scroller = await page.evaluateHandle(() => {
			const all = document.querySelectorAll('main, main *');
			let best = document.scrollingElement;
			let bestSize = best ? best.scrollHeight - best.clientHeight : 0;
			for (const el of all) {
				const s = getComputedStyle(el);
				if (s.overflowY === 'auto' || s.overflowY === 'scroll') {
					const size = el.scrollHeight - el.clientHeight;
					if (size > bestSize) { bestSize = size; best = el; }
				}
			}
			return best;
		});
		await scroller.evaluate((el, y) => el.scrollTo({ top: y, behavior: 'auto' }), Number(process.env.PW_SCROLL) || 1100);
		await page.waitForTimeout(700);
		await page.screenshot({ path: resolve(OUT, `${cfg.name}-${THEME}${LABEL}-scroll.png`), fullPage: false });
		console.log(`captured ${cfg.name}`);
	}
	await context.close();
} finally {
	await browser.close();
}
