import { useId } from 'react';
import styles from './Input.module.css';

/**
 * Input — token-wired text field with optional label, hint, error, and
 * leading/trailing adornments.
 *
 * States: hover / focus-visible / active / disabled / error.
 *
 * Props:
 *   label, hint, error    strings (error overrides hint visually)
 *   leading, trailing     nodes rendered inside the field (e.g. icons)
 *   size                  'sm' | 'md' (default 'md')
 *   id, disabled, ...rest forwarded to the native <input>
 */
const Input = ({
	label,
	hint,
	error,
	leading,
	trailing,
	size = 'md',
	id,
	className = '',
	disabled = false,
	...rest
}) => {
	const reactId = useId();
	const inputId = id || reactId;
	const describedById = error
		? `${inputId}-error`
		: hint
			? `${inputId}-hint`
			: undefined;

	const fieldClasses = [
		styles.field,
		styles[size],
		error ? styles.hasError : '',
		disabled ? styles.disabled : '',
	]
		.filter(Boolean)
		.join(' ');

	return (
		<div className={`${styles.wrapper} ${className}`}>
			{label && (
				<label className={styles.label} htmlFor={inputId}>
					{label}
				</label>
			)}
			<div className={fieldClasses}>
				{leading && <span className={styles.adornment}>{leading}</span>}
				<input
					id={inputId}
					className={styles.input}
					disabled={disabled}
					aria-invalid={error ? true : undefined}
					aria-describedby={describedById}
					{...rest}
				/>
				{trailing && <span className={styles.adornment}>{trailing}</span>}
			</div>
			{error ? (
				<p id={`${inputId}-error`} className={styles.error} role="alert">
					{error}
				</p>
			) : (
				hint && (
					<p id={`${inputId}-hint`} className={styles.hint}>
						{hint}
					</p>
				)
			)}
		</div>
	);
};

export default Input;
