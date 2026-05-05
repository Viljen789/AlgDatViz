import { useEffect, useState } from 'react';
import { ChevronDown, Play, RotateCcw } from 'lucide-react';
import styles from './HashMapHero.module.css';
import { HASH_MAP_PRESETS, HASH_OPERATIONS } from '../hashMapMeta';
import HashMapAlgorithmPicker from '../HashMapAlgorithmPicker/HashMapAlgorithmPicker';
import HashMapReadMoreOverlay from '../HashMapReadMoreOverlay/HashMapReadMoreOverlay';

const HashMapHero = ({
	operationId,
	onOperationChange,
	presetId,
	onPresetChange,
	keyValue,
	onKeyChange,
	valueValue,
	onValueChange,
	onRun,
	onReset,
	capacity,
	entryCount,
	collisions,
	loadFactor,
	statusSuffix,
}) => {
	const [pickerOpen, setPickerOpen] = useState(false);
	const [readMoreOpen, setReadMoreOpen] = useState(false);
	const [presetOpen, setPresetOpen] = useState(false);

	const op = HASH_OPERATIONS[operationId];
	const preset =
		HASH_MAP_PRESETS.find(item => item.id === presetId) || HASH_MAP_PRESETS[0];
	const verb =
		operationId === 'get'
			? 'Find'
			: operationId === 'delete'
				? 'Remove'
				: operationId === 'resize'
					? 'Grow table'
					: 'Put';
	const overload = loadFactor > 0.75;

	useEffect(() => {
		if (!presetOpen) return;
		const onKey = e => {
			if (e.key === 'Escape') setPresetOpen(false);
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [presetOpen]);

	return (
		<header className={styles.hero}>
			<div className={styles.left}>
				<button
					type="button"
					className={styles.title}
					onClick={() => setPickerOpen(true)}
					aria-haspopup="dialog"
					title="Choose hash map operation"
				>
					<span className={styles.titleText}>{op?.name || 'Hash map'}</span>
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
						<span className={styles.statLabel}>buckets</span>
						<span className={styles.statValue}>{capacity}</span>
					</span>
					<span className={styles.notationDot}>·</span>
					<span className={styles.statBlock}>
						<span className={styles.statLabel}>entries</span>
						<span className={styles.statValue}>{entryCount}</span>
					</span>
					<span className={styles.notationDot}>·</span>
					<span
						className={`${styles.statBlock} ${
							overload ? styles.warn : ''
						}`}
					>
						<span className={styles.statLabel}>load</span>
						<span className={styles.statValue}>{loadFactor.toFixed(2)}</span>
					</span>
					<span className={styles.notationDot}>·</span>
					<span
						className={`${styles.statBlock} ${
							collisions > 0 ? styles.warn : ''
						}`}
					>
						<span className={styles.statLabel}>collisions</span>
						<span className={styles.statValue}>{collisions}</span>
					</span>
					{statusSuffix && (
						<>
							<span className={styles.notationDot}>·</span>
							<span className={styles.status}>{statusSuffix}</span>
						</>
					)}
				</div>

				<div className={styles.actions}>
					<div className={styles.menuWrap}>
						<button
							type="button"
							className={styles.ghostBtn}
							onClick={() => setPresetOpen(open => !open)}
							aria-haspopup="listbox"
							aria-expanded={presetOpen}
							title="Choose hash map scenario"
						>
							<span>{preset?.label || 'Scenario'}</span>
							<ChevronDown size={12} strokeWidth={2} />
						</button>
						{presetOpen && (
							<>
								<div
									className={styles.menuBackdrop}
									onClick={() => setPresetOpen(false)}
								/>
								<ul className={styles.presetMenu} role="listbox">
									{HASH_MAP_PRESETS.map(item => (
										<li key={item.id}>
											<button
												type="button"
												role="option"
												aria-selected={item.id === presetId}
												className={`${styles.presetItem} ${
													item.id === presetId ? styles.presetItemActive : ''
												}`}
												onClick={() => {
													onPresetChange(item.id);
													setPresetOpen(false);
												}}
											>
												<span className={styles.presetItemHead}>
													{item.label}
												</span>
												<span className={styles.presetItemIntent}>
													{item.intent}
												</span>
											</button>
										</li>
									))}
								</ul>
							</>
						)}
					</div>
					{op?.needsKey && (
						<input
							type="text"
							className={styles.input}
							value={keyValue}
							onChange={e => onKeyChange(e.target.value)}
							onKeyDown={e => {
								if (e.key === 'Enter') onRun();
							}}
							placeholder="key"
							aria-label="Key"
						/>
					)}
					{op?.needsValue && (
						<input
							type="text"
							className={styles.input}
							value={valueValue}
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
						title="Reset table"
					>
						<RotateCcw size={14} strokeWidth={2} />
						<span>Reset</span>
					</button>
				</div>
			</div>

			<HashMapAlgorithmPicker
				isOpen={pickerOpen}
				onClose={() => setPickerOpen(false)}
				value={operationId}
				onChange={id => {
					onOperationChange(id);
					setPickerOpen(false);
				}}
			/>

			<HashMapReadMoreOverlay
				isOpen={readMoreOpen}
				onClose={() => setReadMoreOpen(false)}
				operationId={operationId}
			/>
		</header>
	);
};

export default HashMapHero;
