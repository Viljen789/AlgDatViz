import { expect, test } from '@playwright/test';

test.use({
	viewport: { width: 320, height: 720 },
	isMobile: true,
	hasTouch: true,
});

test('320px navigation fits and keeps secondary destinations reachable', async ({
	page,
}) => {
	await page.goto('/');
	await page.evaluate(() => document.fonts.ready);

	const nav = page.getByRole('navigation', { name: 'Primary' });
	await expect(nav).toBeVisible();

	const viewportWidth = await page.evaluate(() => window.innerWidth);
	for (const control of [
		page.getByRole('link', { name: 'AlgDatViz home' }),
		page.getByRole('button', { name: 'Open course navigation' }),
		page.getByRole('link', { name: 'Today', exact: true }),
		page.getByRole('link', { name: 'Review', exact: true }),
		page.getByRole('link', { name: 'Exam', exact: true }),
		page.getByRole('button', { name: 'Open navigation menu' }),
	]) {
		const box = await control.boundingBox();
		expect(box, 'mobile navigation control should have a box').not.toBeNull();
		expect(box.x).toBeGreaterThanOrEqual(0);
		expect(box.x + box.width).toBeLessThanOrEqual(viewportWidth);
	}

	await page.getByRole('button', { name: 'Open navigation menu' }).click();
	let dialog = page.getByRole('dialog', { name: 'Navigate' });
	await expect(dialog.getByRole('link', { name: /Learning path/ })).toBeVisible();
	await expect(dialog.getByRole('link', { name: /Reference/ })).toBeVisible();
	await expect(dialog.getByRole('link', { name: /Progress/ })).toBeVisible();
	await expect(dialog.getByRole('button', { name: 'Appearance' })).toBeVisible();

	await dialog.getByRole('link', { name: /Reference/ }).click();
	await expect(page).toHaveURL(/\/reference$/);

	await page.getByRole('button', { name: 'Open navigation menu' }).click();
	dialog = page.getByRole('dialog', { name: 'Navigate' });
	await dialog.getByRole('link', { name: /Progress/ }).click();
	await expect(page).toHaveURL(/\/progress$/);

	await page.getByRole('button', { name: 'Open navigation menu' }).click();
	dialog = page.getByRole('dialog', { name: 'Navigate' });
	await dialog.getByRole('button', { name: 'Appearance' }).click();
	await expect(dialog.getByRole('group', { name: 'Appearance' })).toBeVisible();
});

test('today stays focused while the complete curriculum lives on its own route', async ({
	page,
}) => {
	await page.goto('/');
	await page.evaluate(() => document.fonts.ready);

	await expect(
		page.getByRole('heading', {
			name: 'Your route through all 16 topics of TDT4120.',
		})
	).toHaveCount(0);

	const pathLink = page.getByRole('link', {
		name: 'Browse the full learning path',
	});
	await expect(pathLink).toBeVisible();
	await pathLink.click();

	await expect(page).toHaveURL(/\/path$/);
	await expect(
		page.getByRole('heading', {
			name: 'Your route through all 16 topics of TDT4120.',
		})
	).toBeVisible();
	await expect(
		page.getByRole('button', { name: /Arrays & complexity/ })
	).toBeVisible();
});
