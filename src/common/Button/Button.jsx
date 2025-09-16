import styles from './Button.module.css';

const Button = ({
	children,
	onClick,
	variant = 'secondary',
	disabled = false,
}) => {
	return (
		<button
			onClick={onClick}
			disabled={disabled}
			className={`${styles.button} ${styles[variant]}`}
		>
			{children}
		</button>
	);
};

export default Button;
