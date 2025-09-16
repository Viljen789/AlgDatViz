import { useMemo } from 'react';
import styles from './MergeSortView.module.css';

const MergeSortView = ({
	array,
	currentFrame,
	comparingIndices = [],
	swappingIndices = [],
	sortedIndices = [],
}) => {
	const {
		subarrays,
		currentLevel,
		maxLevel,
		phase,
		mergeIndices,
		leftArray,
		rightArray,
	} = currentFrame.metadata || {};

	const treeStructure = useMemo(() => {
		if (!subarrays || maxLevel === undefined) return [];
		const levels = [];
		for (let level = 0; level <= maxLevel; level++) {
			const levelSubarrays = subarrays.filter(sub => sub.level === level);
			levels.push(levelSubarrays);
		}
		return levels;
	}, [subarrays, maxLevel]);

	return (
		<div className={styles.mergeSortContainer}>
			<div className={styles.phaseIndicator}>
				Phase:{' '}
				{phase === 'dividing'
					? 'Dividing'
					: phase === 'merging'
						? 'Merging'
						: phase === 'completed'
							? 'Completed'
							: 'Initializing'}
				{currentLevel !== undefined && (
					<span className={styles.levelInfo}>
						(Level {currentLevel}/{maxLevel})
					</span>
				)}
			</div>

			<div className={styles.arraySection}>
				<h4>Current Array State</h4>
				<div className={styles.arrayContainer}>
					{array.map((item, index) => (
						<div
							key={item.id}
							className={`${styles.arrayElement}
                ${comparingIndices.includes(index) ? styles.comparing : ''}
                ${swappingIndices.includes(index) ? styles.swapping : ''}
                ${sortedIndices.includes(index) ? styles.sorted : ''}
                ${mergeIndices?.includes(index) ? styles.merging : ''}`}
						>
							{item.value}
						</div>
					))}
				</div>
			</div>

			{phase === 'merging' && leftArray && rightArray && (
				<div className={styles.mergeSection}>
					<h4>Merge Operation</h4>
					<div className={styles.mergeDisplay}>
						<div className={styles.mergeSubarray}>
							<span className={styles.subarrayLabel}>Left:</span>
							<div className={styles.subarrayElements}>
								{leftArray.map((value, index) => (
									<div
										key={index}
										className={styles.leftElement}
									>
										{value}
									</div>
								))}
							</div>
						</div>
						<div className={styles.mergeOperator}>+</div>
						<div className={styles.mergeSubarray}>
							<span className={styles.subarrayLabel}>Right:</span>
							<div className={styles.subarrayElements}>
								{rightArray.map((value, index) => (
									<div
										key={index}
										className={styles.rightElement}
									>
										{value}
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default MergeSortView;
