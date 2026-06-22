import styles from './Badge.module.css';

// A small status pill ("NEXT", "SOON", "NEW", "NEXT UP", "BETA"). Centralises the
// hand-rolled badge/chip patterns scattered across the sidebar, nav rows, and topic
// cards. Tones are token-driven so they theme + topic-tint correctly:
//   neutral — muted on a surface  ·  brand — indigo wash  ·  accent — the page's
//   topic hue  ·  soon — locked/dim  ·  review — the amber review accent.
// Pass `icon` (a lucide component) for a leading glyph.
const Badge = ({
	children,
	tone = 'neutral',
	icon: Icon,
	className = '',
	...rest
}) => (
	<span
		className={`${styles.badge} ${styles[tone] ?? ''} ${className}`}
		{...rest}
	>
		{Icon && <Icon size={11} strokeWidth={2.4} aria-hidden="true" />}
		{children}
	</span>
);

export default Badge;
