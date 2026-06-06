// Capture deeper screenshots of the playground area on the lesson page.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'test-results', 'inspection');
const BASE = process.env.BASE_URL || 'http://localhost:5173';

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
try {
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 2,
		colorScheme: 'dark',
	});
	const page = await context.newPage();
	page.on('pageerror', err => console.error('PAGE ERROR:', err.message));
	page.on('console', msg => {
		if (msg.type() === 'error') console.error('CONSOLE ERROR:', msg.text());
	});
	await page.goto(BASE + '/lessons/merge-sort', { waitUntil: 'networkidle' });
	const scroller = await page.evaluateHandle(() => {
		const candidates = document.querySelectorAll('main, main *');
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
		return best;
	});
	const total = await scroller.evaluate(el => el.scrollHeight);
	const view = await scroller.evaluate(el => el.clientHeight);
	console.log('total scroll height', total, 'viewport', view);

	// Click skip to playground first
	await page.click('text="Skip to playground"');
	await page.waitForTimeout(900);
	await page.screenshot({
		path: resolve(OUT, 'lesson-playground-top.png'),
		fullPage: false,
	});

	// Then scroll a bit further down
	await scroller.evaluate(el => {
		el.scrollBy({ top: 400, behavior: 'auto' });
	});
	await page.waitForTimeout(400);
	await page.screenshot({
		path: resolve(OUT, 'lesson-playground-mid.png'),
		fullPage: false,
	});

	await scroller.evaluate(el => {
		el.scrollBy({ top: 400, behavior: 'auto' });
	});
	await page.waitForTimeout(400);
	await page.screenshot({
		path: resolve(OUT, 'lesson-playground-bottom.png'),
		fullPage: false,
	});

	await context.close();
} finally {
	await browser.close();
}
