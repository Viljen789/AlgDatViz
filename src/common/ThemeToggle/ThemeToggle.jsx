import { useEffect, useId, useRef, useState } from 'react';
import { Check, Moon, Palette, Sun } from 'lucide-react';
import useTheme from '../../hooks/useTheme.js';
import styles from './ThemeToggle.module.css';

const OPTIONS = [
	{
		value: 'neutral',
		label: 'Warm paper',
		description: 'Paper, forest ink + signal mint',
	},
	{
		value: 'editorial',
		label: 'Editorial forest',
		description: 'Forest, sage and mustard',
	},
];

/** Appearance popover used in the desktop sidebar and mobile navigation. */
const ThemeToggle = ({ mobileNav = false, inline = false }) => {
	const { theme, setTheme, palette, setPalette } = useTheme();
	const [open, setOpen] = useState(false);
	const wrapperRef = useRef(null);
	const panelId = useId();

	useEffect(() => {
		if (!open) return undefined;

		const dismiss = event => {
			if (!wrapperRef.current?.contains(event.target)) setOpen(false);
		};
		const onKeyDown = event => {
			if (event.key === 'Escape') {
				setOpen(false);
				wrapperRef.current?.querySelector('button')?.focus();
			}
		};

		document.addEventListener('pointerdown', dismiss);
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('pointerdown', dismiss);
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [open]);

	return (
		<div
			ref={wrapperRef}
			className={`${styles.wrapper} ${mobileNav ? styles.mobileWrapper : ''}`}
		>
			<button
				type="button"
				className={`${styles.trigger} ${mobileNav ? styles.mobileTrigger : ''}`}
				onClick={() => setOpen(value => !value)}
				aria-expanded={open}
				aria-controls={panelId}
				aria-haspopup="true"
				aria-label="Appearance"
			>
				<Palette size={15} strokeWidth={2.1} aria-hidden="true" />
				<span className={styles.desktopLabel}>Appearance</span>
				<span className={styles.mobileLabel}>Theme</span>
			</button>

			{open && (
				<div
					id={panelId}
					className={`${styles.panel} ${inline ? styles.inlinePanel : ''}`}
					role="group"
					aria-label="Appearance"
				>
					<div className={styles.panelHead}>
						<span>Appearance</span>
						<span className={styles.current}>
							{OPTIONS.find(option => option.value === palette)?.label}
						</span>
					</div>

					<fieldset className={styles.group}>
						<legend>Mode</legend>
						<div className={styles.modeGrid}>
							<button
								type="button"
								className={styles.modeOption}
								aria-pressed={theme === 'light'}
								onClick={() => setTheme('light')}
							>
								<Sun size={14} aria-hidden="true" /> Light
							</button>
							<button
								type="button"
								className={styles.modeOption}
								aria-pressed={theme === 'dark'}
								onClick={() => setTheme('dark')}
							>
								<Moon size={14} aria-hidden="true" /> Dark
							</button>
						</div>
					</fieldset>

					<fieldset className={styles.group}>
						<legend>Palette</legend>
						<div className={styles.paletteList}>
							{OPTIONS.map(option => (
								<button
									key={option.value}
									type="button"
									className={styles.paletteOption}
									aria-pressed={palette === option.value}
									onClick={() => setPalette(option.value)}
								>
									<span
										className={`${styles.swatch} ${styles[option.value]}`}
										aria-hidden="true"
									/>
									<span className={styles.optionCopy}>
										<strong>{option.label}</strong>
										<small>{option.description}</small>
									</span>
									{palette === option.value && (
										<Check size={14} aria-hidden="true" />
									)}
								</button>
							))}
						</div>
					</fieldset>
				</div>
			)}
		</div>
	);
};

export default ThemeToggle;
