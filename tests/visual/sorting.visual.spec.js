import { expect, test } from '@playwright/test';

const reduceMotionCss = `
	*, *::before, *::after {
		animation-delay: 0s !important;
		animation-duration: 1ms !important;
		transition-delay: 0s !important;
		transition-duration: 1ms !important;
		scroll-behavior: auto !important;
	}
`;

const installDeterministicRandom = async page => {
	await page.addInitScript(() => {
		let seed = 1337;
		Math.random = () => {
			seed = (seed * 16807) % 2147483647;
			return (seed - 1) / 2147483646;
		};
	});
};

const openSorting = async page => {
	await installDeterministicRandom(page);
	await page.goto('/sorting');
	await page.addStyleTag({ content: reduceMotionCss });
	await page.getByRole('button', { name: 'Playground' }).first().click();
	await expect(
		page.getByRole('button', {
			name: /Bubble Sort|Merge Sort|Heap Sort|Radix Sort/,
		})
	).toBeVisible();
};

const chooseAlgorithm = async (page, label) => {
	await page
		.getByRole('button', { name: /Bubble Sort|Merge Sort|Heap Sort|Radix Sort/ })
		.first()
		.click();
	const dialog = page.getByRole('dialog', { name: /Choose an algorithm/ });
	await expect(dialog).toBeVisible();
	await dialog.getByRole('button', { name: new RegExp(label) }).click();
};

const pauseAtProgress = async (page, progress = 0.45) => {
	await page
		.getByRole('button', { name: /Start sorting|Replay sort|Run again/ })
		.click();
	const pauseButton = page.getByRole('button', { name: 'Pause' });
	await expect(pauseButton).toBeVisible();
	await pauseButton.click();
	const scrubber = page.getByLabel('Scrub to step');
	await expect(scrubber).toBeEnabled();
	await scrubber.evaluate((input, targetProgress) => {
		const max = Number(input.getAttribute('max')) || 0;
		const value = Math.max(0, Math.min(max, Math.floor(max * targetProgress)));
		input.value = String(value);
		input.dispatchEvent(new Event('input', { bubbles: true }));
		input.dispatchEvent(new Event('change', { bubbles: true }));
	}, progress);
};

test.describe('sorting visual regressions', () => {
	test.describe('desktop', () => {
		test.skip(
			({ browserName, isMobile }) => isMobile || browserName !== 'chromium',
			'desktop-only snapshots'
		);

		test('merge sort recursive story', async ({ page }) => {
			await openSorting(page);
			await chooseAlgorithm(page, 'Merge Sort');
			await pauseAtProgress(page, 0.58);

			await expect(page).toHaveScreenshot(
				'sorting-merge-recursive-desktop.png',
				{
					fullPage: false,
				}
			);
		});

		test('comparison mode overlay', async ({ page }) => {
			await openSorting(page);
			await page.getByRole('button', { name: 'Compare' }).click();

			await expect(page).toHaveScreenshot('sorting-comparison-desktop.png', {
				fullPage: false,
			});
		});
	});

	test.describe('mobile', () => {
		test.skip(
			({ browserName, isMobile }) => !isMobile || browserName !== 'chromium',
			'mobile-only snapshots'
		);

		test('radix buckets stay readable', async ({ page }) => {
			await openSorting(page);
			await chooseAlgorithm(page, 'Radix Sort');
			await pauseAtProgress(page, 0.5);

			await expect(page).toHaveScreenshot('sorting-radix-mobile.png', {
				fullPage: false,
			});
		});

		test('heap tree keeps controls reachable', async ({ page }) => {
			await openSorting(page);
			await chooseAlgorithm(page, 'Heap Sort');
			await pauseAtProgress(page, 0.42);

			await expect(page).toHaveScreenshot('sorting-heap-mobile.png', {
				fullPage: false,
			});
		});
	});
});
