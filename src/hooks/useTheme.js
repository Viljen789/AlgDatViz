import { useCallback, useEffect, useState } from 'react';

// Single source of truth for theme resolution. Mirrors the inline anti-flash
// script in index.html (keep the two in sync): an explicit stored preference
// wins; otherwise the warm light presentation is the product default.
export const THEME_STORAGE_KEY = 'algdatviz:theme';
export const PALETTE_STORAGE_KEY = 'algdatviz:palette';
const APPEARANCE_EVENT = 'algdatviz:appearance-change';

export const normalizePalette = value =>
	value === 'editorial' ? 'editorial' : 'neutral';

export const readStoredPalette = storage => {
	try {
		return normalizePalette(storage.getItem(PALETTE_STORAGE_KEY));
	} catch {
		return 'neutral';
	}
};

export const persistPalette = (storage, palette) => {
	try {
		storage.setItem(PALETTE_STORAGE_KEY, normalizePalette(palette));
		return true;
	} catch {
		return false;
	}
};

const getStoredTheme = () => {
	try {
		const stored = localStorage.getItem(THEME_STORAGE_KEY);
		return stored === 'light' || stored === 'dark' ? stored : null;
	} catch {
		return null;
	}
};

const resolveInitialTheme = () => getStoredTheme() ?? 'light';

const applyTheme = theme => {
	if (typeof document !== 'undefined') {
		document.documentElement.dataset.theme = theme;
	}
};

const applyPalette = palette => {
	if (typeof document !== 'undefined') {
		document.documentElement.dataset.palette = normalizePalette(palette);
	}
};

/**
 * Theme hook: resolves the initial theme (stored pref, else light), reflects it
 * as `data-theme` on <html>, and persists explicit choices.
 *
 * @returns {{ theme: 'light'|'dark', setTheme: (t:'light'|'dark')=>void, toggle: ()=>void }}
 */
const useTheme = () => {
	const [theme, setThemeState] = useState(resolveInitialTheme);
	const [palette, setPaletteState] = useState(() =>
		typeof localStorage === 'undefined'
			? 'neutral'
			: readStoredPalette(localStorage)
	);

	// Keep the DOM attribute in sync with state (covers re-mounts / SSR-less
	// first render where the inline script may not have run in tests).
	useEffect(() => {
		applyTheme(theme);
	}, [theme]);

	useEffect(() => {
		applyPalette(palette);
	}, [palette]);

	// The desktop and mobile controls are both mounted so responsive switches do
	// not need to remount the app. Keep their local hook instances synchronized.
	useEffect(() => {
		const onAppearanceChange = event => {
			if (event.detail?.theme) setThemeState(event.detail.theme);
			if (event.detail?.palette)
				setPaletteState(normalizePalette(event.detail.palette));
		};
		window.addEventListener(APPEARANCE_EVENT, onAppearanceChange);
		return () =>
			window.removeEventListener(APPEARANCE_EVENT, onAppearanceChange);
	}, []);

	const setTheme = useCallback(next => {
		try {
			localStorage.setItem(THEME_STORAGE_KEY, next);
		} catch {
			// Ignore storage failures (private mode etc.) — theme still applies.
		}
		setThemeState(next);
		window.dispatchEvent(
			new CustomEvent(APPEARANCE_EVENT, { detail: { theme: next } })
		);
	}, []);

	const toggle = useCallback(() => {
		setThemeState(prev => {
			const next = prev === 'dark' ? 'light' : 'dark';
			try {
				localStorage.setItem(THEME_STORAGE_KEY, next);
			} catch {
				// Ignore.
			}
			window.dispatchEvent(
				new CustomEvent(APPEARANCE_EVENT, { detail: { theme: next } })
			);
			return next;
		});
	}, []);

	const setPalette = useCallback(next => {
		const resolved = normalizePalette(next);
		if (typeof localStorage !== 'undefined')
			persistPalette(localStorage, resolved);
		setPaletteState(resolved);
		window.dispatchEvent(
			new CustomEvent(APPEARANCE_EVENT, { detail: { palette: resolved } })
		);
	}, []);

	return { theme, setTheme, toggle, palette, setPalette };
};

export default useTheme;
