import styles from './RadixSortView.module.css';
import { useMemo } from 'react';

const RadixSortView = ({
	array,
	currentFrame,
	comparingIndices = [],
	swappingIndices = [],
}) => {
	const {
		phase = 'initializing',
		exp = 1,
		buckets = [],
		currentDigit,
		currentIndex,
	} = currentFrame.metadata || {};

	const processedBuckets = useMemo(() => {
		return Array.from({ length: 10 }, (_, index) => ({
			index,
			elements: buckets[index] || [],
		}));
	}, [buckets]);

	return (
		<div className={styles.radixSortContainer}>
			<div className={styles.phaseIndicator}>
				<span>
					Phase: <strong>{phase}</strong>
				</span>
				<span>
					Sorting by: <strong>{exp}s Place</strong>
				</span>
			</div>

			<div className={styles.bucketsSection}>
				<h4>Digit Buckets (0-9)</h4>
				<div className={styles.bucketsContainer}>
					{processedBuckets.map(({ index, elements }) => (
						<div
							key={index}
							className={`${styles.bucket} ${currentDigit === index && phase === 'distributing' ? styles.activeBucket : ''}`}
						>
							<div className={styles.bucketLabel}>{index}</div>
							<div className={styles.bucketContent}>
								{elements.length === 0 ? (
									<div className={styles.emptyBucket}>-</div>
								) : (
									elements.map((value, elemIndex) => (
										<div
											key={elemIndex}
											className={styles.bucketElement}
										>
											{value}
										</div>
									))
								)}
							</div>
						</div>
					))}
				</div>
			</div>

			<div className={styles.arraySection}>
				<h4>Array State</h4>
				<div className={styles.arrayContainer}>
					{array.map((item, index) => {
						const digit = Math.floor(item.value / exp) % 10;
						return (
							<div
								key={item.id}
								className={`
                                    ${styles.arrayElement}
                                    ${currentIndex === index && phase === 'distributing' ? styles.comparing : ''}
                                    ${swappingIndices.includes(index) && phase === 'collecting' ? styles.swapping : ''}
                                `}
							>
								<span className={styles.elementValue}>
									{item.value}
								</span>
								<span
									className={`
                                        ${styles.elementDigit}
                                        ${currentIndex === index && phase === 'distributing' ? styles.highlightDigit : ''}
                                    `}
								>
									{digit}
								</span>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};

export default RadixSortView;
