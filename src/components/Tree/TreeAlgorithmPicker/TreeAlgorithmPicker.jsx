import OverlaySheet from '../../../common/OverlaySheet/OverlaySheet';
import {
	TREE_OPERATIONS,
	TREE_OP_ORDER,
	TREE_CATEGORY_ORDER,
} from '../treeAlgorithmMeta';
import styles from './TreeAlgorithmPicker.module.css';

const TreeAlgorithmPicker = ({ isOpen, onClose, value, onChange }) => {
	const grouped = TREE_CATEGORY_ORDER.map(category => ({
		category,
		items: TREE_OP_ORDER.filter(
			id => TREE_OPERATIONS[id]?.category === category
		),
	})).filter(group => group.items.length > 0);

	return (
		<OverlaySheet
			isOpen={isOpen}
			onClose={onClose}
			title="Choose an operation"
			subtitle="BST operations modify the tree. Traversals walk it in a fixed order."
			width={760}
		>
			<div className={styles.groups}>
				{grouped.map(group => (
					<section key={group.category} className={styles.group}>
						<h3 className={styles.category}>{group.category}</h3>
						<ul className={styles.list} role="listbox">
							{group.items.map(id => {
								const op = TREE_OPERATIONS[id];
								const isActive = id === value;
								return (
									<li key={id} role="option" aria-selected={isActive}>
										<button
											type="button"
											className={`${styles.row} ${isActive ? styles.rowActive : ''}`}
											onClick={() => onChange(id)}
										>
											<span className={styles.name}>{op.name}</span>
											<span className={styles.phrase}>{op.motionPhrase}</span>
											<span className={styles.complexity}>{op.complexity}</span>
										</button>
									</li>
								);
							})}
						</ul>
					</section>
				))}
			</div>
		</OverlaySheet>
	);
};

export default TreeAlgorithmPicker;
