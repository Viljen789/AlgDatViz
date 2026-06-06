import { createElement } from 'react';
import styles from './Surface.module.css';

/**
 * Surface — the elevation primitive. Renders a layered background tint with a
 * matching shadow from the token elevation ramp. Everything else (Card, panels,
 * popovers) builds on top of this.
 *
 * Props:
 *   level:    0 | 1 | 2 | 3            surface tint step (default 1)
 *   elevation: 'none' | 1 | 2 | 3 | 4  shadow step (default matches level)
 *   as:       element/component to render (default 'div')
 *   inset:    boolean — recessed well style
 *   className, ...rest
 */
const Surface = ({
	level = 1,
	elevation,
	as = 'div',
	inset = false,
	className = '',
	children,
	...rest
}) => {
	const resolvedElevation = elevation ?? level;
	const classes = [
		styles.surface,
		styles[`level${level}`],
		inset ? styles.inset : styles[`elevation${resolvedElevation}`],
		className,
	]
		.filter(Boolean)
		.join(' ');

	return createElement(as, { className: classes, ...rest }, children);
};

export default Surface;
