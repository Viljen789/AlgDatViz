import { useMemo } from 'react';
import styles from './BucketSortView.module.css';

const BucketSortView = ({
	array,
	currentFrame,
	comparingIndices = [],
	swappingIndices = [],
	sortedIndices = [],
}) => {
	const { buckets, bucketCount, phase, currentBucket } =
		currentFrame.metadata || {};

	const processedBuckets = useMemo(() => {
		if (!buckets || !bucketCount) return [];
		return Array.from({ length: bucketCount }, (_, index) => ({
			index,
			elements: buckets[index] || [],
			isActive: currentBucket === index,
		}));
	}, [buckets, bucketCount, currentBucket]);

	return (
		<div className={styles.bucketSortContainer}>
			<div className={styles.phaseIndicator}>
				Phase:{' '}
				{phase === 'distributing'
					? 'Distributing'
					: phase === 'sorting'
						? 'Sorting Buckets'
						: phase === 'collecting'
							? 'Collecting'
							: 'Initializing'}
			</div>

			<div className={styles.arraySection}>
				<h4>Current Array</h4>
				<div className={styles.arrayContainer}>
					{array.map((item, index) => (
						<div
							key={item.id}
							className={`${styles.arrayElement}
                ${comparingIndices.includes(index) ? styles.comparing : ''}
                ${swappingIndices.includes(index) ? styles.swapping : ''}
                ${sortedIndices.includes(index) ? styles.sorted : ''}`}
						>
							{item.value}
						</div>
					))}
				</div>
			</div>

			<div className={styles.bucketsSection}>
				<h4>Buckets</h4>
				<div className={styles.bucketsContainer}>
					{processedBuckets.map(({ index, elements, isActive }) => (
						<div
							key={index}
							className={`${styles.bucket} ${isActive ? styles.activeBucket : ''}`}
						>
							<div className={styles.bucketLabel}>Bucket {index}</div>
							<div className={styles.bucketContent}>
								{elements.length === 0 ? (
									<div className={styles.emptyBucket}>Empty</div>
								) : (
									elements.map((value, elemIndex) => (
										<div key={elemIndex} className={styles.bucketElement}>
											{value}
										</div>
									))
								)}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export default BucketSortView;
