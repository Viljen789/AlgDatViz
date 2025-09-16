import styles from './ArrayVisualizer.module.css';

const BarView = ({
	array,
	comparingIndices = [],
	swappingIndices = [],
	sortedIndices = [],
	currentIndex,
	isFastMode,
}) => {
	const maxValue = Math.max(...array.map(item => item.value));

	const getBarColor = index => {
		if (isFastMode) return 'var(--color-text-secondary)';
		if (sortedIndices.includes(index)) return 'var(--color-primary)';
		if (swappingIndices.includes(index)) return 'var(--color-swapping-bar)';
		return 'var(--color-text-secondary)';
	};

	const getBarHeight = value => {
		return Math.max((value / maxValue) * 280);
	};

	const isHighlighting = index => {
		if (isFastMode) return false;
		return (
			comparingIndices.includes(index) ||
			swappingIndices.includes(index) ||
			currentIndex === index
		);
	};

	return (
		<div className={styles.barContainer}>
			{array.map((item, index) => (
				<div
					key={item.id}
					className={`${styles.arrayBar} ${isHighlighting(index) ? styles.highlighting : ''}`}
					style={{
						height: `${getBarHeight(item.value)}px`,

						backgroundColor: getBarColor(index),
					}}
					title={`Value: ${item.value}, Index: ${index}`}
				/>
			))}
		</div>
	);
};

export default BarView;
