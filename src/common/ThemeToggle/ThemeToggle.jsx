import { Moon, Sun } from 'lucide-react';
import useTheme from '../../hooks/useTheme.js';
import styles from './ThemeToggle.module.css';

/**
 * Theme switch for the sidebar footer. Follows the OS on first load (handled by
 * useTheme); clicking persists an explicit light/dark choice to localStorage.
 * `aria-pressed` reflects "dark mode on"; the label always names the action.
 */
const ThemeToggle = () => {
	const { theme, toggle } = useTheme();
	const isDark = theme === 'dark';

	return (
		<button
			type="button"
			className={styles.toggle}
			onClick={toggle}
			aria-pressed={isDark}
			aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
			title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
		>
			<span className={styles.icon} aria-hidden="true">
				{isDark ? (
					<Moon size={15} strokeWidth={2.2} />
				) : (
					<Sun size={15} strokeWidth={2.2} />
				)}
			</span>
			<span className={styles.label}>{isDark ? 'Dark' : 'Light'}</span>
		</button>
	);
};

export default ThemeToggle;
