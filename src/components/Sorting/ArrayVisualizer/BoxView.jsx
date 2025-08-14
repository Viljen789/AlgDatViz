// src/components/Sorting/ArrayVisualizer/BoxView.jsx
import {LayoutGroup, motion} from 'framer-motion';
import styles from './ArrayVisualizer.module.css';

const BoxView = ({array, comparingIndices, swappingIndices, sortedIndices}) => {
	return (
		<LayoutGroup>
			<div className={styles.boxContainer}>
				{array.map((item, index) => {
					const isComparing = comparingIndices.includes(index);
					const isSorted = sortedIndices.includes(index);

					let stateClass = '';
					if (isSorted) stateClass = styles.sortedBox;
					else if (isComparing) stateClass = styles.comparingBox;

					return (
						<motion.div
							layout
							key={item.id}
							className={`${styles.numberBox} ${stateClass}`}
							transition={{type: 'spring', stiffness: 300, damping: 30}}
						>
							{item.value}
						</motion.div>
					);
				})}
			</div>
		</LayoutGroup>
	);
};

export default BoxView; // This line was missing
