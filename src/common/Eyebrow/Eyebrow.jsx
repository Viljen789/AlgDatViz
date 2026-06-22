import styles from './Eyebrow.module.css';

// The mono, uppercase, letter-spaced kicker used above headings across the site
// ("YOUR PATH", "04 · SORTING", "MASTERY · SPACED RETRIEVAL"). Centralised so the
// pattern (font, size, tracking, colour) stays identical everywhere and tracks the
// design tokens. `tone="accent"` uses the page's topic-accent ink (or brand);
// default is muted. Extra props (data-*, ref via forwarding caller, etc.) pass
// through so animated eyebrows (e.g. the home hero's data-hero-eyebrow) still work.
const Eyebrow = ({
	children,
	tone = 'muted',
	as = 'p',
	className = '',
	...rest
}) => {
	const Tag = as;
	return (
		<Tag
			className={`${styles.eyebrow} ${tone === 'accent' ? styles.accent : ''} ${className}`}
			{...rest}
		>
			{children}
		</Tag>
	);
};

export default Eyebrow;
