import styles from './Panel.module.css';

const Panel = ({ children, className = '', style = {} }) => {
	const combinedClassName = `${styles.panel} ${className}`;

	return (
		<div className={combinedClassName} style={style}>
			{children}
		</div>
	);
};

export default Panel;
