// Headless screenshot capture for the new HomePage and MergeSortLesson at
// multiple viewports. Run while `npm run dev` is up.
//   node scripts/inspect.mjs
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'test-results', 'inspection');
const BASE = process.env.BASE_URL || 'http://localhost:5173';

const VIEWPORTS = [
	{ name: 'desktop', width: 1440, height: 900 },
	{ name: 'tablet', width: 900, height: 1200 },
	{ name: 'mobile', width: 390, height: 844 },
];

const PAGES = [
	{
		path: '/',
		name: 'home',
		clearStorage: true,
		scrollSequence: [0, 600, 1200, 1800, 2400],
	},
	{
		path: '/lessons/merge-sort',
		name: 'lesson',
		clearStorage: false,
		scrollSequence: [0, 700, 1400, 2100, 2800, 3500, 4200],
	},
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
try {
	for (const viewport of VIEWPORTS) {
		const context = await browser.newContext({
			viewport: { width: viewport.width, height: viewport.height },
			deviceScaleFactor: 2,
			colorScheme: 'dark',
		});
		const page = await context.newPage();
		for (const cfg of PAGES) {
			if (cfg.clearStorage) {
				await page.goto(BASE + '/');
				await page.evaluate(() => window.localStorage.clear());
			}
			await page.goto(BASE + cfg.path, { waitUntil: 'networkidle' });
			// Find the page-level scroll container.
			const scroller = await page.evaluateHandle(() => {
				const candidates = document.querySelectorAll('main, main > div *');
				let best = null;
				let bestSize = 0;
				for (const el of candidates) {
					const style = window.getComputedStyle(el);
					if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
						const size = el.scrollHeight - el.clientHeight;
						if (size > bestSize) {
							bestSize = size;
							best = el;
						}
					}
				}
				return best || document.scrollingElement;
			});
			for (let i = 0; i < cfg.scrollSequence.length; i++) {
				const y = cfg.scrollSequence[i];
				await scroller.evaluate((el, y) => {
					el.scrollTo({ top: y, behavior: 'auto' });
				}, y);
				await page.waitForTimeout(450);
				const file = `${cfg.name}-${viewport.name}-${String(i).padStart(
					2,
					'0'
				)}-y${y}.png`;
				await page.screenshot({
					path: resolve(OUT, file),
					fullPage: false,
				});
			}
		}
		await context.close();
		console.log(`captured ${viewport.name}`);
	}
} finally {
	await browser.close();
}
