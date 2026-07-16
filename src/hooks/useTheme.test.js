import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	PALETTE_STORAGE_KEY,
	normalizePalette,
	persistPalette,
	readStoredPalette,
} from './useTheme.js';

const appearanceBootstrap = ({
	stored = {},
	dark = false,
	storageThrows = false,
} = {}) => {
	const html = readFileSync(
		new URL('../../index.html', import.meta.url),
		'utf8'
	);
	const script = html.match(
		/<script>\s*([\s\S]*?algdatviz:palette[\s\S]*?)<\/script>/
	)?.[1];
	assert.ok(script, 'appearance bootstrap script exists');

	const dataset = {};
	runInNewContext(script, {
		document: { documentElement: { dataset } },
		localStorage: {
			getItem(key) {
				if (storageThrows) throw new Error('storage unavailable');
				return stored[key] ?? null;
			},
		},
		window: { matchMedia: () => ({ matches: dark }) },
	});
	return { dataset, html };
};

test('palette normalization defaults invalid values to neutral', () => {
	assert.equal(normalizePalette(undefined), 'neutral');
	assert.equal(normalizePalette('forest'), 'neutral');
	assert.equal(normalizePalette('neutral'), 'neutral');
	assert.equal(normalizePalette('editorial'), 'editorial');
});

test('palette persistence stores a normalized value', () => {
	const values = new Map();
	const storage = {
		getItem: key => values.get(key) ?? null,
		setItem: (key, value) => values.set(key, value),
	};
	assert.equal(persistPalette(storage, 'editorial'), true);
	assert.equal(values.get(PALETTE_STORAGE_KEY), 'editorial');
	assert.equal(readStoredPalette(storage), 'editorial');
	assert.equal(persistPalette(storage, 'invalid'), true);
	assert.equal(values.get(PALETTE_STORAGE_KEY), 'neutral');
});

test('palette storage failures fall back safely', () => {
	const storage = {
		getItem() {
			throw new Error('storage unavailable');
		},
		setItem() {
			throw new Error('storage unavailable');
		},
	};
	assert.equal(readStoredPalette(storage), 'neutral');
	assert.equal(persistPalette(storage, 'editorial'), false);
});

test('bootstrap restores editorial palette and explicit mode before styles load', () => {
	const { dataset, html } = appearanceBootstrap({
		stored: {
			'algdatviz:theme': 'dark',
			'algdatviz:palette': 'editorial',
		},
	});
	assert.deepEqual(dataset, { theme: 'dark', palette: 'editorial' });
	assert.ok(
		html.indexOf('algdatviz:palette') < html.indexOf('fonts.googleapis.com')
	);
});

test('bootstrap defaults invalid palette values to neutral', () => {
	const { dataset } = appearanceBootstrap({
		stored: { 'algdatviz:palette': 'wrong' },
		dark: true,
	});
	assert.deepEqual(dataset, { theme: 'light', palette: 'neutral' });
});

test('bootstrap falls back to neutral light when storage is unavailable', () => {
	const { dataset } = appearanceBootstrap({ storageThrows: true, dark: true });
	assert.deepEqual(dataset, { theme: 'light', palette: 'neutral' });
});
