import { useState } from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';
import styles from './StrategiesHero.module.css';
import {
	STRATEGY_ALGORITHMS,
	COIN_CHANGE_PRESETS,
} from '../strategiesMeta';
import StrategiesAlgorithmPicker from '../StrategiesAlgorithmPicker/StrategiesAlgorithmPicker';
import StrategiesReadMoreOverlay from '../StrategiesReadMoreOverlay/StrategiesReadMoreOverlay';

const StrategiesHero = ({
	algorithmId,
	onAlgorithmChange,
	presetId,
	onPresetChange,
	onReset,
	statusSuffix,
}) => {
	const [pickerOpen, setPickerOpen] = useState(false);
	const [presetOpen, setPresetOpen] = useState(false);
	const [readMoreOpen, setReadMoreOpen] = useState(false);

	const algo = STRATEGY_ALGORITHMS[algorithmId];
	const preset =
		algorithmId === 'coinChange'
			? COIN_CHANGE_PRESETS.find(p => p.id === presetId) || COIN_CHANGE_PRESETS[0]
			: null;

	return (
		<header className={styles.hero}>
			<div className={styles.left}>
				<button
					type="button"
					className={styles.title}
					onClick={() => setPickerOpen(true)}
					aria-haspopup="dialog"
					title="Choose strategy problem"
				>
					<span className={styles.titleText}>{algo?.name || 'Strategies'}</span>
					<ChevronDown
						size={20}
						strokeWidth={1.75}
						className={styles.titleChevron}
					/>
				</button>
				<p className={styles.oneLine}>{algo?.oneLine}</p>
			</div>

			<div className={styles.right}>
				<div className={styles.notation}>
					<span className={styles.complexity}>{algo?.complexity}</span>
					{preset && (
						<>
							<span className={styles.notationDot}>·</span>
							<div className={styles.presetWrap}>
								<button
									type="button"
									className={styles.presetBtn}
									onClick={() => setPresetOpen(o => !o)}
									aria-haspopup="listbox"
									aria-expanded={presetOpen}
									title="Pick a target and coin set"
								>
									<span>
										target = {preset.target}¢ · coins [
										{preset.coins.join(', ')}]
									</span>
									<ChevronDown size={12} strokeWidth={2} />
								</button>
								{presetOpen && (
									<>
										<div
											className={styles.menuBackdrop}
											onClick={() => setPresetOpen(false)}
										/>
										<ul className={styles.presetMenu} role="listbox">
											{COIN_CHANGE_PRESETS.map(p => (
												<li key={p.id} role="option" aria-selected={p.id === presetId}>
													<button
														type="button"
														className={`${styles.presetItem} ${
															p.id === presetId ? styles.presetItemActive : ''
														}`}
														onClick={() => {
															onPresetChange(p.id);
															setPresetOpen(false);
														}}
													>
														<span className={styles.presetItemHead}>
															{p.label}
														</span>
														<span className={styles.presetItemMath}>
															target = {p.target}¢ · coins [
															{p.coins.join(', ')}]
														</span>
														<span className={styles.presetItemIntent}>
															{p.intent}
														</span>
													</button>
												</li>
											))}
										</ul>
									</>
								)}
							</div>
						</>
					)}
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
						className={styles.ghostBtn}
						onClick={() => setReadMoreOpen(true)}
					>
						Read more
					</button>
					<button
						type="button"
						className={styles.ghostBtn}
						onClick={onReset}
						title="Reset walkthrough"
					>
						<RotateCcw size={14} strokeWidth={2} />
						<span>Reset</span>
					</button>
				</div>
			</div>

			<StrategiesAlgorithmPicker
				isOpen={pickerOpen}
				onClose={() => setPickerOpen(false)}
				value={algorithmId}
				onChange={id => {
					onAlgorithmChange(id);
					setPickerOpen(false);
				}}
			/>

			<StrategiesReadMoreOverlay
				isOpen={readMoreOpen}
				onClose={() => setReadMoreOpen(false)}
				algorithmId={algorithmId}
			/>
		</header>
	);
};

export default StrategiesHero;
