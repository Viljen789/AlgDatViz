import { useCallback, useEffect, useState } from 'react';

// Single source of truth for theme resolution. Mirrors the inline anti-flash
// script in index.html (keep the two in sync): stored pref wins, else follow
// the OS via prefers-color-scheme.
export const THEME_STORAGE_KEY = 'algdatviz:theme';

const getStoredTheme = () => {
	try {
		const stored = localStorage.getItem(THEME_STORAGE_KEY);
		return stored === 'light' || stored === 'dark' ? stored : null;
	} catch {
		return null;
	}
};

const getSystemTheme = () =>
	typeof window !== 'undefined' &&
	window.matchMedia &&
	window.matchMedia('(prefers-color-scheme: dark)').matches
		? 'dark'
		: 'light';

const resolveInitialTheme = () => getStoredTheme() ?? getSystemTheme();

const applyTheme = theme => {
	if (typeof document !== 'undefined') {
		document.documentElement.dataset.theme = theme;
	}
};

/**
 * Theme hook: resolves the initial theme (stored pref, else OS), reflects it as
 * `data-theme` on <html>, persists explicit choices, and — while NO explicit
 * pref is stored — follows live OS changes.
 *
 * @returns {{ theme: 'light'|'dark', setTheme: (t:'light'|'dark')=>void, toggle: ()=>void }}
 */
const useTheme = () => {
	const [theme, setThemeState] = useState(resolveInitialTheme);

	// Keep the DOM attribute in sync with state (covers re-mounts / SSR-less
	// first render where the inline script may not have run in tests).
	useEffect(() => {
		applyTheme(theme);
	}, [theme]);

	// Follow the OS only while the user hasn't made an explicit choice.
	useEffect(() => {
		if (!window.matchMedia) return undefined;
		const media = window.matchMedia('(prefers-color-scheme: dark)');
		const onChange = event => {
			if (getStoredTheme() === null) {
				setThemeState(event.matches ? 'dark' : 'light');
			}
		};
		media.addEventListener('change', onChange);
		return () => media.removeEventListener('change', onChange);
	}, []);

	const setTheme = useCallback(next => {
		try {
			localStorage.setItem(THEME_STORAGE_KEY, next);
		} catch {
			// Ignore storage failures (private mode etc.) — theme still applies.
		}
		setThemeState(next);
	}, []);

	const toggle = useCallback(() => {
		setThemeState(prev => {
			const next = prev === 'dark' ? 'light' : 'dark';
			try {
				localStorage.setItem(THEME_STORAGE_KEY, next);
			} catch {
				// Ignore.
			}
			return next;
		});
	}, []);

	return { theme, setTheme, toggle };
};

export default useTheme;
