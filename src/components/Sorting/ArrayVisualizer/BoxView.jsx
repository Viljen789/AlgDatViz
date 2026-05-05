import { useMemo } from 'react';
import { LayoutGroup, motion as Motion } from 'framer-motion';
import styles from './ArrayVisualizer.module.css';

const BoxView = ({
	array,
	currentFrame,
	comparingIndices = [],
	swappingIndices = [],
	sortedIndices = [],
	specialIndices = [],
	isFastMode = false,
}) => {
	const values = useMemo(() => {
		if (currentFrame?.array && Array.isArray(currentFrame.array)) {
			return currentFrame.array.map(v =>
				typeof v === 'object' && v !== null ? v.value : v
			);
		}
		return (array || []).map(item =>
			typeof item === 'object' && item !== null ? item.value : item
		);
	}, [currentFrame, array]);

	return (
		<LayoutGroup>
			<div className={styles.boxContainer}>
				{values.map((value, index) => {
					const isSorted = sortedIndices.includes(index);
					const isSpecial = !isFastMode && specialIndices.includes(index);
					const isSwapping = !isFastMode && swappingIndices.includes(index);
					const isComparing = !isFastMode && comparingIndices.includes(index);

					let stateClass = '';
					if (isSorted) stateClass = styles.sortedBox;
					else if (isSpecial) stateClass = styles.specialBox;
					else if (isSwapping) stateClass = styles.swappingBox;
					else if (isComparing) stateClass = styles.comparingBox;

					return (
						<Motion.div
							key={`v-${index}-${value}`}
							layout
							className={`${styles.numberBox} ${stateClass}`}
							transition={{
								type: 'tween',
								duration: 0.32,
								ease: [0.16, 1, 0.3, 1],
							}}
						>
							{value}
						</Motion.div>
					);
				})}
			</div>
		</LayoutGroup>
	);
};

export default BoxView;
