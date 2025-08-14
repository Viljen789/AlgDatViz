import styles from './ArrayVisualizer.module.css';

const BarView = ({array, comparingIndices = [], swappingIndices = [], sortedIndices = [], currentIndex}) => {
  const maxValue = Math.max(...array.map(item => item.value));

  const getBarColor = (index) => {
    if (sortedIndices.includes(index)) {
      return 'var(--color-primary)';
    } else if (swappingIndices.includes(index)) {
      return '#dc3545';
    } else if (comparingIndices.includes(index)) {
      return 'var(--color-secondary)';
    } else {
      return '#6c757d';
    }
  };

  const getBarHeight = (value) => {
    return Math.max((value / maxValue) * 280, 10);
  };

  const isHighlighting = (index) => {
    return comparingIndices.includes(index) ||
           swappingIndices.includes(index) ||
           currentIndex === index;
  };

  return (
    <div className={styles.barContainer} data-size={array.length}>
      {array.map((item, index) => (
        <div
          key={item.id}
          className={`${styles.arrayBar} ${isHighlighting(index) ? styles.highlighting : ''}`}
          style={{
            height: `${getBarHeight(item.value)}px`,
            backgroundColor: getBarColor(index),
          }}
          title={`Value: ${item.value}, Index: ${index}`}
        />
      ))}
    </div>
  );
};

export default BarView;
