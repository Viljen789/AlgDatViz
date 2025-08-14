import BarView from './BarView';
import BoxView from './BoxView';
import styles from './ArrayVisualizer.module.css';

const ArrayVisualizer = ({viewMode, array, ...animationProps}) => {
	return (
		<div className={styles.visualizerContainer}>
			{viewMode === 'bars'
				? <BarView array={array} {...animationProps} />
				: <BoxView array={array} {...animationProps} />
			}
		</div>
	);
};

export default ArrayVisualizer;
