import styles from './Button.module.css';

/**
 * Button — token-wired primitive.
 *
 * Props:
 *   variant: 'primary' | 'secondary' | 'ghost' | 'danger'  (default 'secondary')
 *   size:    'sm' | 'md' | 'lg'                              (default 'md')
 *   loading: boolean — shows a spinner and blocks clicks
 *   disabled, type, onClick, className, ...rest
 *
 * Every variant defines hover / focus-visible / active / disabled states.
 */
const Button = ({
	children,
	onClick,
	variant = 'secondary',
	size = 'md',
	type = 'button',
	loading = false,
	disabled = false,
	className = '',
	...rest
}) => {
	const classes = [
		styles.button,
		styles[variant],
		styles[size],
		loading ? styles.loading : '',
		className,
	]
		.filter(Boolean)
		.join(' ');

	return (
		<button
			type={type}
			onClick={onClick}
			disabled={disabled || loading}
			aria-busy={loading || undefined}
			className={classes}
			{...rest}
		>
			{loading && <span className={styles.spinner} aria-hidden="true" />}
			<span className={styles.label}>{children}</span>
		</button>
	);
};

export default Button;
