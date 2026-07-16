import { Button as SharedButton } from '@viljen789/study-ui';
import { Link } from 'react-router-dom';
import styles from './Button.module.css';

const classesFor = ({ variant, size, loading, className, transport = false }) =>
	[
		styles.button,
		styles[variant],
		styles[size],
		loading ? styles.loading : '',
		transport ? styles.transport : '',
		className,
	]
		.filter(Boolean)
		.join(' ');

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
	transport = false,
	...rest
}) => {
	const classes = classesFor({ variant, size, loading, className, transport });

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

export const ActionLink = ({
	children,
	variant = 'secondary',
	size = 'md',
	className = '',
	...rest
}) => (
	<Link
		className={classesFor({
			variant,
			size,
			loading: false,
			className,
		})}
		{...rest}
	>
		{children}
	</Link>
);

export const TransportButton = ({ className = '', ...props }) => (
	<Button
		variant="ghost"
		size="sm"
		transport
		className={className}
		{...props}
	/>
);

export default Button;
