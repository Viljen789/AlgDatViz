import styles from './AlgorithmStats.module.css';
const AlgorithmStats = ({ info }) => {
	if (!info) return null;
	return (
		<div className={styles.statsContainer}>
			<div className={styles.statItem}>
				<span className={styles.label}>Time (Best)</span>
				<span className={styles.value}>
					{info.complexity.time.best}
				</span>
			</div>
			<div className={styles.statItem}>
				<span className={styles.label}>Time (Avg)</span>
				<span className={styles.value}>
					{info.complexity.time.average}
				</span>
			</div>
			<div className={styles.statItem}>
				<span className={styles.label}>Time (Worst)</span>
				<span className={styles.value}>
					{info.complexity.time.worst}
				</span>
			</div>
			<div className={styles.statItem}>
				<span className={styles.label}>Space</span>
				<span className={styles.value}>
					{info.complexity.space.worst}
				</span>
			</div>
			<div className={styles.statItem}>
				<span className={styles.label}>Stable</span>
				<span className={styles.value}>
					{info.properties.stable ? 'Yes' : 'No'}
				</span>
			</div>
		</div>
	);
};
export default AlgorithmStats;
