import { useMemo } from 'react';
import styles from './CountingSortView.module.css';

const CountingSortView = ({
	array,
	currentFrame,
	comparingIndices = [],
	swappingIndices = [],
	sortedIndices = [],
}) => {
	const { countArray, max, phase } = currentFrame.metadata || {};

	const frequencyBars = useMemo(() => {
		if (!countArray || max === undefined) return [];
		return Array.from({ length: max + 1 }, (_, index) => ({
			value: index,
			count: countArray[index] || 0,
			height: Math.max((countArray[index] || 0) * 30, 5),
		}));
	}, [countArray, max]);

	return (
		<div className={styles.countingSortContainer}>
			<div className={styles.phaseIndicator}>
				Phase:{' '}
				{phase === 'counting'
					? 'Counting Frequencies'
					: phase === 'reconstructing'
						? 'Reconstructing Array'
						: 'Initializing'}
			</div>

			<div className={styles.arraySection}>
				<h4>Original Array</h4>
				<div className={styles.arrayContainer}>
					{array.map((item, index) => (
						<div
							key={item.id}
							className={`${styles.arrayElement}
                ${comparingIndices.includes(index) ? styles.comparing : ''}
                ${sortedIndices.includes(index) ? styles.sorted : ''}`}
						>
							{item.value}
						</div>
					))}
				</div>
			</div>

			{frequencyBars.length > 0 && (
				<div className={styles.histogramSection}>
					<h4>Frequency Count</h4>
					<div className={styles.histogram}>
						{frequencyBars.map(({ value, count, height }) => (
							<div key={value} className={styles.histogramBar}>
								<div
									className={styles.bar}
									style={{ height: `${height}px` }}
								>
									<span className={styles.count}>
										{count}
									</span>
								</div>
								<div className={styles.value}>{value}</div>
							</div>
						))}
					</div>
				</div>
			)}

			{phase === 'reconstructing' && (
				<div className={styles.resultSection}>
					<h4>Reconstructed Array</h4>
					<div className={styles.arrayContainer}>
						{array.map((item, index) => (
							<div
								key={item.id}
								className={`${styles.arrayElement}
                  ${swappingIndices.includes(index) ? styles.placing : ''}
                  ${sortedIndices.includes(index) ? styles.sorted : ''}`}
							>
								{item.value}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

export default CountingSortView;
