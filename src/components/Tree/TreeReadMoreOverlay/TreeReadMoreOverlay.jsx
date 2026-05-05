import OverlaySheet from '../../../common/OverlaySheet/OverlaySheet';
import { TREE_OPERATIONS } from '../treeAlgorithmMeta';
import styles from './TreeReadMoreOverlay.module.css';

const SHARED_NOTES = {
	'BST operation': {
		summary:
			'BST operations rely on the ordering rule: smaller values left, larger values right. Each step descends one level, so cost tracks tree height.',
		watchOuts: [
			'Plain BSTs can become unbalanced and lose logarithmic behavior.',
			'Delete with two children needs the inorder successor swap.',
		],
	},
	Traversal: {
		summary:
			'Traversals visit every node in a fixed order. Inorder gives sorted output for a BST. Pre/post order define recursive shape; level order uses a queue.',
		watchOuts: [
			'Every traversal touches every node — cost is O(n).',
			'Same tree, different traversal, very different output.',
		],
	},
};

const TreeReadMoreOverlay = ({ isOpen, onClose, operationId }) => {
	const op = TREE_OPERATIONS[operationId];
	if (!op) return null;
	const note = SHARED_NOTES[op.category] || {};

	return (
		<OverlaySheet
			isOpen={isOpen}
			onClose={onClose}
			title={op.name}
			subtitle={op.oneLine}
			variant="bottom"
		>
			<div className={styles.body}>
				<section className={styles.section}>
					<h3 className={styles.h}>How it thinks</h3>
					<p className={styles.p}>{note.summary}</p>
				</section>

				<section className={styles.complexity}>
					<div className={styles.cBlock}>
						<span className={styles.cLabel}>TIME</span>
						<span className={styles.cVal}>{op.complexity}</span>
					</div>
					<div className={styles.cBlock}>
						<span className={styles.cLabel}>SPACE</span>
						<span className={styles.cVal}>
							{op.category === 'Traversal' && operationId === 'levelorder'
								? 'O(w) — widest level'
								: 'O(h) — tree height'}
						</span>
					</div>
					<div className={styles.cBlock}>
						<span className={styles.cLabel}>RECURSION</span>
						<span className={styles.cVal}>
							{op.category === 'Traversal' && operationId !== 'levelorder'
								? 'natural fit'
								: op.category === 'Traversal'
									? 'iterative (queue)'
									: 'natural fit'}
						</span>
					</div>
				</section>

				{note.watchOuts && (
					<section className={styles.section}>
						<h3 className={styles.h}>Watch out for</h3>
						<ul className={styles.bullets}>
							{note.watchOuts.map((s, i) => (
								<li key={i}>{s}</li>
							))}
						</ul>
					</section>
				)}
			</div>
		</OverlaySheet>
	);
};

export default TreeReadMoreOverlay;
