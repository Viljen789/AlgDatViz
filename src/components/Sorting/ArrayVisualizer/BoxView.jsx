import {LayoutGroup, motion} from 'framer-motion';
import styles from './ArrayVisualizer.module.css';

const BoxView = ({array, comparingIndices = [], swappingIndices = [], sortedIndices = [], currentIndex}) => {
  return (
    <LayoutGroup>
      <div className={styles.boxContainer}>
        {array.map((item, index) => {
          const isComparing = comparingIndices.includes(index);
          const isSwapping = swappingIndices.includes(index);
          const isSorted = sortedIndices.includes(index);
          const isHighlighting = isComparing || isSwapping || currentIndex === index;

          let stateClass = '';
          if (isSorted) stateClass = styles.sortedBox;
          else if (isSwapping) stateClass = styles.swappingBox;
          else if (isComparing) stateClass = styles.comparingBox;

          return (
            <motion.div
              key={item.id}
              layout
              className={`${styles.numberBox} ${stateClass} ${isHighlighting ? styles.highlighting : ''}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                layout: { duration: 0.3 },
                scale: { duration: 0.2 },
                opacity: { duration: 0.2 }
              }}
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
