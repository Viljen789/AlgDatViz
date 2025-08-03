import styles from './ArrayVisualizer.module.css';

const ArrayVisualizer = ({array, comparingIndices, swappingIndices, sortedIndices}) => {
	return (
		<div className={styles.visualizerContainer}>
			{array.map((value, index) => {
				const isComparing = comparingIndices.includes(index);
				const isSwapping = swappingIndices.includes(index);
				const isSorted = sortedIndices.includes(index);

				const barColor = isSorted ? 'var(--color-primary)'
					: isSwapping ? 'var(--color-tertiary)'
						: isComparing ? 'var(--color-secondary)'
							: 'var(--viz-edge-color)';

				return (
					<div
						key={index}
						className={styles.arrayBar}
						style={{
							height: `${value}px`,
							backgroundColor: barColor,
						}}
					>
					</div>
				);
			})}
		</div>
	);
};
export default ArrayVisualizer;
