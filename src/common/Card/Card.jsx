import { createElement } from 'react';
import { Card as SharedCard } from '@viljen789/study-ui';
import styles from './Card.module.css';

/**
 * Card — content container built on the Surface elevation system.
 *
 * Props:
 *   interactive: boolean — adds hover / focus-visible / active affordances
 *   accent:      a color value to tint the card's accent rail + focus glow
 *                (e.g. var(--topic-graphs)). Set via the --card-accent var.
 *   as:          element/component (default 'div'; use 'a'/'button' for links)
 *   padded:      boolean — default true; false removes inner padding
 *   className, ...rest
 */
const Card = ({
	interactive = false,
	accent,
	as = 'div',
	padded = true,
	className = '',
	style,
	children,
	...rest
}) => {
	const classes = [
		styles.card,
		interactive ? styles.interactive : '',
		padded ? styles.padded : '',
		accent ? styles.accented : '',
		className,
	]
		.filter(Boolean)
		.join(' ');

	const mergedStyle = accent ? { ...style, '--card-accent': accent } : style;

	return createElement(SharedCard, {
		as,
		interactive,
		padded,
		accent,
		className: classes,
		style: mergedStyle,
		...rest,
		children,
	});
};

/** CardEmpty — a token-wired empty-state slot for use inside a Card. */
export const CardEmpty = ({ icon, title, children }) => (
	<div className={styles.empty}>
		{icon && <div className={styles.emptyIcon}>{icon}</div>}
		{title && <p className={styles.emptyTitle}>{title}</p>}
		{children && <div className={styles.emptyBody}>{children}</div>}
	</div>
);

export default Card;
