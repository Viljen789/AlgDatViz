import { LayoutGroup, motion } from 'framer-motion';
import styles from './ArrayVisualizer.module.css';

const BoxView = ({
	array,
	comparingIndices = [],
	swappingIndices = [],
	sortedIndices = [],
	currentIndex,
	isFastMode = false,
	isPaused,
	onAnimationComplete,
}) => {
	const handleAnimationComplete = () => {
		if (!isPaused) {
			onAnimationComplete();
		}
	};
	return (
		<LayoutGroup>
			<div className={styles.boxContainer}>
				{array.map((item, index) => {
					const isComparing = !isFastMode && comparingIndices.includes(index);
					const isSwapping = swappingIndices.includes(index);
					const isSorted = sortedIndices.includes(index);
					const isHighlighting =
						isComparing || isSwapping || currentIndex === index;
					let stateClass = '';
					if (isSorted) stateClass = styles.sortedBox;
					else if (isSwapping) stateClass = styles.swappingBox;
					else if (isComparing) stateClass = styles.comparingBox;

					return (
						<motion.div
							key={item.id}
							layout
							className={`${styles.numberBox} ${stateClass} ${isHighlighting ? styles.highlighting : ''}`}
							onLayoutAnimationComplete={
								index === 0 ? handleAnimationComplete : undefined
							}
							transition={{ duration: 0.6, ease: 'easeInOut' }}
						>
							{item.value}
						</motion.div>
					);
				})}
			</div>
		</LayoutGroup>
	);
};

export default BoxView;
