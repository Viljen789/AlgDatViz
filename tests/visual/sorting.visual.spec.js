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

const sortingSandbox = page => page.locator('#sorting-sandbox');
const visualizationCanvas = page =>
	sortingSandbox(page).getByRole('region', { name: 'Visualization canvas' });
const algorithmWorkspace = (page, name) =>
	visualizationCanvas(page).getByRole('region', { name });

const openSorting = async page => {
	await installDeterministicRandom(page);
	await page.goto('/lessons/merge-sort');
	await page.addStyleTag({ content: reduceMotionCss });
	// Component snapshots should not include the lesson's sticky route header
	// composited over the algorithm workspace when Playwright scrolls it into view.
	await page
		.getByRole('button', { name: 'Skip to playground' })
		.evaluate(button => {
			button.closest('header').style.position = 'relative';
		});
	await page.getByRole('button', { name: 'Open the sandbox' }).click();
	await expect(
		sortingSandbox(page).getByRole('button', {
			name: 'Bubble sort',
			exact: true,
		})
	).toBeVisible();
};

const chooseAlgorithm = async (page, label) => {
	await sortingSandbox(page).locator('button[aria-haspopup="dialog"]').click();
	const dialog = page.getByRole('dialog', { name: /Choose an algorithm/ });
	await expect(dialog).toBeVisible();
	await dialog.getByRole('button', { name: new RegExp(label) }).click();
};

const pauseAtProgress = async (page, progress = 0.45) => {
	const sandbox = sortingSandbox(page);
	await sandbox
		.getByRole('button', { name: /Start sorting|Replay sort|Run again/ })
		.click();
	const pauseButton = sandbox.getByRole('button', { name: 'Pause' });
	await expect(pauseButton).toBeVisible();
	await pauseButton.click();
	await expect(sandbox.getByRole('button', { name: 'Play' })).toBeVisible();
	const scrubber = sandbox.getByLabel('Scrub to step');
	await expect(scrubber).toBeEnabled();
	const max = Number(await scrubber.getAttribute('max')) || 0;
	const targetStep = Math.max(0, Math.min(max, Math.floor(max * progress)));

	// Playwright's range fill goes through the browser's native input path. Directly
	// assigning input.value only moves the thumb of React's controlled input and
	// leaves the visualizer on frame zero.
	await scrubber.fill(String(targetStep));
	await expect(scrubber).toHaveValue(String(targetStep));
	await expect(
		sandbox.getByText(`step ${targetStep + 1} / ${max + 1}`, { exact: true })
	).toBeVisible();
};

const childrenFitInside = locator =>
	locator.evaluate(element => {
		const bounds = element.getBoundingClientRect();
		return [...element.children].every(child => {
			const childBounds = child.getBoundingClientRect();
			return (
				childBounds.top >= bounds.top - 1 &&
				childBounds.right <= bounds.right + 1 &&
				childBounds.bottom <= bounds.bottom + 1 &&
				childBounds.left >= bounds.left - 1
			);
		});
	});

test.describe('sorting visual regressions', () => {
	test.describe('desktop', () => {
		test.skip(
			({ browserName, isMobile }) => isMobile || browserName !== 'chromium',
			'desktop-only snapshots'
		);

		test('merge sort recursive story', async ({ page }) => {
			await openSorting(page);
			await chooseAlgorithm(page, 'Merge sort');
			await pauseAtProgress(page, 0.58);

			const workspace = algorithmWorkspace(
				page,
				'Merge sort recursive workspace'
			);
			await expect.poll(() => childrenFitInside(workspace)).toBe(true);
			await expect(workspace).toHaveScreenshot(
				'sorting-merge-recursive-desktop.png'
			);
		});

		test('comparison panel', async ({ page }) => {
			await openSorting(page);
			await sortingSandbox(page)
				.getByRole('button', { name: 'Compare' })
				.click();

			await expect(
				sortingSandbox(page).getByRole('region', {
					name: 'Algorithm comparison',
				})
			).toHaveScreenshot('sorting-comparison-desktop.png');
		});
	});

	test.describe('mobile', () => {
		test.skip(
			({ browserName, isMobile }) => !isMobile || browserName !== 'chromium',
			'mobile-only snapshots'
		);

		test('radix buckets stay readable', async ({ page }) => {
			await openSorting(page);
			await chooseAlgorithm(page, 'Radix sort');
			await pauseAtProgress(page, 0.5);

			const workspace = algorithmWorkspace(page, 'Radix sort digit workspace');
			const buckets = workspace.getByRole('list', {
				name: 'Digit buckets',
			});
			await expect(buckets.getByRole('listitem')).toHaveCount(10);
			await expect.poll(() => childrenFitInside(buckets)).toBe(true);
			await expect(workspace).toHaveScreenshot('sorting-radix-mobile.png');
		});

		test('heap tree stays readable', async ({ page }) => {
			await openSorting(page);
			await chooseAlgorithm(page, 'Heap sort');
			await pauseAtProgress(page, 0.42);

			const workspace = algorithmWorkspace(page, 'Heap sort tree workspace');
			const heapCheck = workspace.getByRole('group', {
				name: 'Current heap check',
			});
			await expect.poll(() => childrenFitInside(heapCheck)).toBe(true);
			await expect
				.poll(() =>
					workspace
						.locator('[data-heap-node]')
						.evaluateAll(nodes =>
							Math.min(...nodes.map(node => node.getBoundingClientRect().width))
						)
				)
				.toBeGreaterThanOrEqual(40);
			await expect(workspace).toHaveScreenshot('sorting-heap-mobile.png');
		});
	});
});
