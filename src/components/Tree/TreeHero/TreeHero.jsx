import { useState } from 'react';
import { ChevronDown, Play, RotateCcw } from 'lucide-react';
import styles from './TreeHero.module.css';
import { TREE_OPERATIONS } from '../treeAlgorithmMeta';
import TreeAlgorithmPicker from '../TreeAlgorithmPicker/TreeAlgorithmPicker';
import TreeReadMoreOverlay from '../TreeReadMoreOverlay/TreeReadMoreOverlay';

const TreeHero = ({
	operationId,
	onOperationChange,
	value,
	onValueChange,
	onRun,
	onReset,
	stats,
	statusSuffix,
}) => {
	const [pickerOpen, setPickerOpen] = useState(false);
	const [readMoreOpen, setReadMoreOpen] = useState(false);

	const op = TREE_OPERATIONS[operationId];
	const verb =
		operationId === 'search'
			? 'Find'
			: operationId === 'insert'
				? 'Insert'
				: operationId === 'delete'
					? 'Remove'
					: 'Run';

	return (
		<header className={styles.hero}>
			<div className={styles.left}>
				<button
					type="button"
					className={styles.title}
					onClick={() => setPickerOpen(true)}
					aria-haspopup="dialog"
					title="Choose tree operation"
				>
					<span className={styles.titleText}>{op?.name || 'Tree'}</span>
					<ChevronDown
						size={20}
						strokeWidth={1.75}
						className={styles.titleChevron}
					/>
				</button>
				<p className={styles.oneLine}>{op?.oneLine}</p>
			</div>

			<div className={styles.right}>
				<div className={styles.notation}>
					<span className={styles.complexity}>{op?.complexity}</span>
					<span className={styles.notationDot}>·</span>
					<span className={styles.statBlock}>
						<span className={styles.statLabel}>nodes</span>
						<span className={styles.statValue}>{stats?.count ?? 0}</span>
					</span>
					<span className={styles.notationDot}>·</span>
					<span className={styles.statBlock}>
						<span className={styles.statLabel}>height</span>
						<span className={styles.statValue}>{stats?.height ?? 0}</span>
					</span>
					<span className={styles.notationDot}>·</span>
					<span
						className={`${styles.statBlock} ${
							stats?.balanced ? styles.balanced : styles.unbalanced
						}`}
					>
						<span className={styles.statLabel}>balanced</span>
						<span className={styles.statValue}>
							{stats?.balanced ? 'yes' : 'no'}
						</span>
					</span>
					{statusSuffix && (
						<>
							<span className={styles.notationDot}>·</span>
							<span className={styles.status}>{statusSuffix}</span>
						</>
					)}
				</div>

				<div className={styles.actions}>
					{op?.needsValue && (
						<input
							type="number"
							className={styles.valueInput}
							value={value}
							onChange={e => onValueChange(e.target.value)}
							onKeyDown={e => {
								if (e.key === 'Enter') onRun();
							}}
							placeholder="value"
							aria-label="Value"
						/>
					)}
					<button
						type="button"
						className={styles.primaryBtn}
						onClick={onRun}
						title={op?.needsValue ? `${verb} value` : 'Run traversal'}
					>
						<Play size={13} strokeWidth={2.4} fill="currentColor" />
						<span>{verb}</span>
					</button>
					<button
						type="button"
						className={styles.ghostBtn}
						onClick={() => setReadMoreOpen(true)}
					>
						Read more
					</button>
					<button
						type="button"
						className={styles.ghostBtn}
						onClick={onReset}
						title="Reset tree to default"
					>
						<RotateCcw size={14} strokeWidth={2} />
						<span>Reset</span>
					</button>
				</div>
			</div>

			<TreeAlgorithmPicker
				isOpen={pickerOpen}
				onClose={() => setPickerOpen(false)}
				value={operationId}
				onChange={id => {
					onOperationChange(id);
					setPickerOpen(false);
				}}
			/>

			<TreeReadMoreOverlay
				isOpen={readMoreOpen}
				onClose={() => setReadMoreOpen(false)}
				operationId={operationId}
			/>
		</header>
	);
};

export default TreeHero;
