import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests/visual',
	outputDir: './test-results/visual',
	fullyParallel: false,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 1 : 0,
	reporter: [['list']],
	use: {
		baseURL: 'http://127.0.0.1:4173',
		colorScheme: 'dark',
		reducedMotion: 'reduce',
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
	},
	webServer: {
		command: 'npm run dev -- --host 127.0.0.1 --port 4173',
		url: 'http://127.0.0.1:4173',
		reuseExistingServer: !process.env.CI,
		timeout: 120000,
	},
	projects: [
		{
			name: 'desktop',
			use: {
				...devices['Desktop Chrome'],
				viewport: { width: 1440, height: 960 },
			},
		},
		{
			name: 'mobile',
			use: {
				...devices['Pixel 5'],
				viewport: { width: 393, height: 851 },
				isMobile: true,
			},
		},
	],
});

