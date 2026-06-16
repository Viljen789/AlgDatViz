import { useMemo } from 'react';
import styles from './BucketSortView.module.css';

const BucketSortView = ({
	array = [],
	currentFrame = null,
	comparingIndices = [],
	swappingIndices = [],
	sortedIndices = [],
}) => {
	const frame =
		currentFrame && typeof currentFrame === 'object' ? currentFrame : null;
	const metadata = frame?.metadata || {};
	const {
		buckets,
		bucketCount,
		bucketRanges = [],
		phase = 'ready',
		currentBucket,
		targetBucket,
		activeValue,
		sortedBuckets = [],
		bucketLoads = [],
		maxBucketLoad = 0,
		idealBucketLoad = 0,
		distributionQuality = 'ready',
		skewRatio = 0,
	} = metadata;

	const values = useMemo(() => {
		const source = frame?.array || array || [];
		return source.map((item, index) => ({
			id:
				item && typeof item === 'object' && 'id' in item
					? item.id
					: `bucket-value-${index}-${item?.value ?? item}`,
			value:
				item && typeof item === 'object' && 'value' in item ? item.value : item,
		}));
	}, [array, frame]);

	const previewBucketCount =
		bucketCount || Math.max(1, Math.floor(Math.sqrt(values.length)) || 1);
	const previewMax = values.length
		? Math.max(...values.map(item => item.value), 0)
		: 0;
	const previewRanges = Array.from(
		{ length: previewBucketCount },
		(_, index) => {
			const lower = Math.floor((index * (previewMax + 1)) / previewBucketCount);
			const upper = Math.max(
				lower,
				Math.floor(((index + 1) * (previewMax + 1)) / previewBucketCount) - 1
			);
			return { lower, upper };
		}
	);
	const safeBuckets =
		buckets || Array.from({ length: previewBucketCount }, () => []);
	const safeRanges = bucketRanges.length ? bucketRanges : previewRanges;
	const safeLoads =
		bucketLoads.length > 0
			? bucketLoads
			: safeBuckets.map(bucket => bucket.length);

	const processedBuckets = useMemo(() => {
		return Array.from({ length: previewBucketCount }, (_, index) => ({
			index,
			elements: safeBuckets[index] || [],
			range: safeRanges[index],
			isActive: currentBucket === index || targetBucket === index,
			isSorted: sortedBuckets.includes(index),
		}));
	}, [
		currentBucket,
		previewBucketCount,
		safeBuckets,
		safeRanges,
		targetBucket,
		sortedBuckets,
	]);

	const phaseLabel =
		phase === 'distributing'
			? 'Distribute by range'
			: phase === 'sorting'
				? 'Sort inside bucket'
				: phase === 'collecting'
					? 'Concatenate buckets'
					: phase === 'completed'
						? 'Complete'
						: 'Ready';

	const activeNarration =
		phase === 'distributing' && targetBucket !== undefined
			? `${activeValue} belongs in bucket ${targetBucket}`
			: phase === 'sorting' && currentBucket !== undefined
				? `Bucket ${currentBucket} is sorted locally`
				: phase === 'collecting' && currentBucket !== undefined
					? `Bucket ${currentBucket} writes back to the array`
					: 'Press Start to distribute values into range buckets';

	const qualityLabel =
		distributionQuality === 'balanced'
			? 'balanced'
			: distributionQuality === 'overloaded'
				? 'overloaded'
				: distributionQuality === 'uneven'
					? 'uneven'
					: 'not measured';

	return (
		<div className={styles.bucketSortContainer}>
			<div className={styles.phaseIndicator}>
				<span className={styles.phaseLabel}>{phaseLabel}</span>
				<span className={styles.phaseNarration}>{activeNarration}</span>
			</div>

			<div
				className={styles.qualityStrip}
				aria-label="Bucket distribution quality"
			>
				<div>
					<span>quality</span>
					<strong>{qualityLabel}</strong>
				</div>
				<div>
					<span>largest bucket</span>
					<strong>{maxBucketLoad || Math.max(...safeLoads, 0)}</strong>
				</div>
				<div>
					<span>ideal load</span>
					<strong>
						{idealBucketLoad ? idealBucketLoad.toFixed(1) : '0.0'}
					</strong>
				</div>
				<p>
					Worst case appears when one bucket gets much heavier than the rest
					{skewRatio ? ` (${skewRatio.toFixed(1)}x ideal).` : '.'}
				</p>
			</div>

			<div className={styles.arraySection}>
				<h3 className={styles.sectionTitle}>Current array</h3>
				<div className={styles.arrayContainer}>
					{values.map((item, index) => (
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
				<h3 className={styles.sectionTitle}>Range buckets</h3>
				<div className={styles.bucketsContainer}>
					{processedBuckets.map(
						({ index, elements, range, isActive, isSorted }) => (
							<div
								key={index}
								className={`${styles.bucket} ${isActive ? styles.activeBucket : ''} ${
									isSorted ? styles.sortedBucket : ''
								}`}
							>
								<div className={styles.bucketLabel}>
									<span>Bucket {index}</span>
									{range && (
										<span className={styles.bucketRange}>
											{range.lower}-{range.upper}
										</span>
									)}
								</div>
								<div className={styles.bucketContent}>
									{elements.length === 0 ? (
										<div className={styles.emptyBucket}>empty</div>
									) : (
										elements.map((value, elemIndex) => (
											<div key={elemIndex} className={styles.bucketElement}>
												{value}
											</div>
										))
									)}
								</div>
							</div>
						)
					)}
				</div>
			</div>
		</div>
	);
};

export default BucketSortView;
