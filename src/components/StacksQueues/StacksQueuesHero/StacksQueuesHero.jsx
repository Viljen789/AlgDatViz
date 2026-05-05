import { ArrowDownToLine, ArrowUpFromLine, Eye, RotateCcw } from 'lucide-react';
import styles from './StacksQueuesHero.module.css';
import { SQ_MODES } from '../stacksQueuesMeta';

const StacksQueuesHero = ({
	mode,
	onModeChange,
	onAdd,
	onRemove,
	onPeek,
	onReset,
	count,
	statusSuffix,
}) => {
	const m = SQ_MODES[mode];
	return (
		<header className={styles.hero}>
			<div className={styles.left}>
				<div className={styles.titleRow}>
					<button
						type="button"
						className={`${styles.modeBtn} ${mode === 'stack' ? styles.modeBtnActive : ''}`}
						onClick={() => onModeChange('stack')}
					>
						Stack
					</button>
					<span className={styles.divider}>/</span>
					<button
						type="button"
						className={`${styles.modeBtn} ${mode === 'queue' ? styles.modeBtnActive : ''}`}
						onClick={() => onModeChange('queue')}
					>
						Queue
					</button>
				</div>
				<p className={styles.oneLine}>{m?.oneLine}</p>
			</div>

			<div className={styles.right}>
				<div className={styles.notation}>
					<span className={styles.acronym}>{m?.acronym}</span>
					<span className={styles.notationDot}>·</span>
					<span className={styles.complexity}>{m?.complexity}</span>
					<span className={styles.notationDot}>·</span>
					<span className={styles.statBlock}>
						<span className={styles.statLabel}>items</span>
						<span className={styles.statValue}>{count}</span>
					</span>
					{statusSuffix && (
						<>
							<span className={styles.notationDot}>·</span>
							<span className={styles.status}>{statusSuffix}</span>
						</>
					)}
				</div>

				<div className={styles.actions}>
					<button
						type="button"
						className={styles.primaryBtn}
						onClick={onAdd}
					>
						<ArrowDownToLine size={13} strokeWidth={2.4} />
						<span>{m?.addLabel}</span>
					</button>
					<button
						type="button"
						className={styles.ghostBtn}
						onClick={onRemove}
					>
						<ArrowUpFromLine size={13} strokeWidth={2.4} />
						<span>{m?.removeLabel}</span>
					</button>
					<button
						type="button"
						className={styles.ghostBtn}
						onClick={onPeek}
					>
						<Eye size={13} strokeWidth={2.4} />
						<span>Peek</span>
					</button>
					<button
						type="button"
						className={styles.ghostBtn}
						onClick={onReset}
						title="Reset"
					>
						<RotateCcw size={13} strokeWidth={2} />
					</button>
				</div>
			</div>
		</header>
	);
};

export default StacksQueuesHero;
