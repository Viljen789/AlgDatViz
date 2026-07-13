import { Button as SharedButton } from '@viljen789/study-ui';
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
		<SharedButton
			type={type}
			onClick={onClick}
			disabled={disabled}
			loading={loading}
			variant={variant}
			size={size}
			className={classes}
			{...rest}
		>
			{children}
		</SharedButton>
	);
};

export default Button;
