import styles from './PseudoCodeViewer.module.css';
import { PSEUDO_CODE } from '../../../utils/sorting/algorithmInfo.js';

const PseudoCodeViewer = ({ algorithm, activeLine, isFastMode }) => {
	const codeLines = PSEUDO_CODE[algorithm] || [
		'Algorithm not found.',
		'Please select an algorithm to see its pseudocode.',
	];

	const algorithmName = algorithm.replace(/([A-Z])/g, ' $1').trim();

	return (
		<div className={styles.pseudoCodeContainer}>
			<div className={styles.header}>
				<h3>{algorithmName} Pseudocode</h3>
			</div>
			<div className={styles.codeContent}>
				<div className={styles.codeBlockWrapper}>
					{codeLines.map((line, index) => (
						<div
							key={index}
							className={`${styles.codeLine} ${
								activeLine === index + 1 && !isFastMode
									? styles.activeLine
									: ''
							}`}
						>
							<span className={styles.lineNumber}>
								{index + 1}
							</span>
							<pre className={styles.lineText}>{line}</pre>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export default PseudoCodeViewer;
