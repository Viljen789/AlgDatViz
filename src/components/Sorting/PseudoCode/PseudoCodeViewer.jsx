import styles from './PseudoCodeViewer.module.css';
import {PSEUDO_CODE} from '../../../utils/sortingAlgorithms';

const PseudoCodeViewer = ({algorithm, activeLine}) => {
	const codeLines = PSEUDO_CODE[algorithm] || [];

	return (
		<div className={styles.pseudoCodeContainer}>
			<h3 className={styles.title}>{algorithm.replace(/([A-Z])/g, ' $1').trim()} Pseudo-code</h3>
			<div className={styles.codeBlock}>
				{codeLines.map((line, index) => (
					line === '' ? <div key={index} className={styles.spacer}></div> :
						<div
							key={index}
							className={`${styles.codeLine} ${index + 1 === activeLine ? styles.activeLine : ''}`}
						>
							<span className={styles.lineNumber}>{index + 1}</span>
							<code className={styles.codeText}>{line}</code>
						</div>
				))}
			</div>
		</div>
	);
};

export default PseudoCodeViewer;
