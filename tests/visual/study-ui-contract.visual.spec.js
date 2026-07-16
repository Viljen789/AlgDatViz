import { expect, test } from '@playwright/test';

test.describe('shared study-ui visual contract', () => {
	test.skip(
		({ browserName, isMobile }) => isMobile || browserName !== 'chromium',
		'desktop contract snapshot'
	);

	test('annotated working paper and interaction roles stay coherent', async ({
		page,
	}) => {
		await page.goto('/styleguide');
		const contract = page.getByTestId('study-ui-contract');
		await expect(contract).toBeVisible();
		await contract.scrollIntoViewIfNeeded();
		await expect(contract).toHaveScreenshot('study-ui-contract-desktop.png', {
			animations: 'disabled',
		});
	});
});
