import styles from './NodeButtons.module.css';

export const NodeButton = ({
	onClick,
	title,
	children,
	className = '',
	...props
}) => (
	<button
		onClick={onClick}
		className={`${styles.nodeButton} ${className}`}
		title={title}
		{...props}
	>
		{children}
	</button>
);

export const AddNodeButton = ({
	onClick,
	title = 'Add node',
	className = '',
}) => (
	<NodeButton
		onClick={onClick}
		title={title}
		className={`${styles.addButton} ${className}`}
	>
		<span className={styles.plusIcon}>+</span>
	</NodeButton>
);

export const DeleteNodeButton = ({
	onClick,
	title = 'Delete node',
	className = '',
}) => (
	<NodeButton
		onClick={onClick}
		title={title}
		className={`${styles.deleteButton} ${className}`}
	>
		×
	</NodeButton>
);
