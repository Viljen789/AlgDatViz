import { useEffect, useRef, useState } from 'react';
import {
	ChevronFirst,
	ChevronLast,
	ChevronLeft,
	ChevronRight,
	Pause,
	Play,
} from 'lucide-react';
import styles from './StepControlBar.module.css';

const StepControlBar = ({
	isPlaying,
	canStep,
	currentStep,
	totalSteps,
	speed,
	speedOptions,
	onPlayPause,
	onStepBack,
	onStepForward,
	onSeek,
	onFirst,
	onLast,
	onSpeedChange,
	rightSlot = null,
	layout = 'dock',
}) => {
	const [speedOpen, setSpeedOpen] = useState(false);
	const speedRef = useRef(null);

	useEffect(() => {
		if (!speedOpen) return;
		const onDocClick = e => {
			if (speedRef.current && !speedRef.current.contains(e.target)) {
				setSpeedOpen(false);
			}
		};
		document.addEventListener('mousedown', onDocClick);
		const onKey = e => {
			if (e.key === 'Escape') setSpeedOpen(false);
		};
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDocClick);
			document.removeEventListener('keydown', onKey);
		};
	}, [speedOpen]);

	useEffect(() => {
		const onKey = e => {
			if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')
				return;
			if (e.key === ' ') {
				e.preventDefault();
				onPlayPause?.();
			} else if (e.key === 'ArrowLeft') {
				e.preventDefault();
				onStepBack?.();
			} else if (e.key === 'ArrowRight') {
				e.preventDefault();
				onStepForward?.();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [onPlayPause, onStepBack, onStepForward]);

	const currentSpeedLabel =
		speedOptions?.find(opt => opt.value === speed)?.label || `${speed}×`;
	const max = Math.max((totalSteps || 1) - 1, 0);
	const value = Math.min(currentStep || 0, max);

	return (
		<div
			className={`${styles.bar} ${layout === 'panel' ? styles.panel : ''}`}
			role="toolbar"
			aria-label="Playback"
		>
			<button
				type="button"
				className={styles.btn}
				onClick={onFirst}
				disabled={!canStep || value === 0}
				aria-label="First step"
				title="First step"
			>
				<ChevronFirst size={16} strokeWidth={1.6} />
			</button>
			<button
				type="button"
				className={styles.btn}
				onClick={onStepBack}
				disabled={!canStep || value === 0}
				aria-label="Step back"
				title="Step back ( ← )"
			>
				<ChevronLeft size={16} strokeWidth={1.6} />
			</button>
			<button
				type="button"
				className={`${styles.btn} ${styles.play}`}
				onClick={onPlayPause}
				disabled={!canStep}
				aria-label={isPlaying ? 'Pause' : 'Play'}
				title={isPlaying ? 'Pause (space)' : 'Play (space)'}
			>
				{isPlaying ? (
					<Pause size={18} strokeWidth={1.6} fill="currentColor" />
				) : (
					<Play size={18} strokeWidth={1.6} fill="currentColor" />
				)}
			</button>
			<button
				type="button"
				className={styles.btn}
				onClick={onStepForward}
				disabled={!canStep || value >= max}
				aria-label="Step forward"
				title="Step forward ( → )"
			>
				<ChevronRight size={16} strokeWidth={1.6} />
			</button>
			<button
				type="button"
				className={styles.btn}
				onClick={onLast}
				disabled={!canStep || value >= max}
				aria-label="Last step"
				title="Last step"
			>
				<ChevronLast size={16} strokeWidth={1.6} />
			</button>

			<div className={styles.divider} aria-hidden="true" />

			<div className={styles.scrub}>
				<input
					className={styles.range}
					type="range"
					min={0}
					max={max}
					value={value}
					disabled={!canStep}
					onChange={e => onSeek?.(Number(e.target.value))}
					aria-label="Scrub to step"
				/>
			</div>

			<div className={styles.divider} aria-hidden="true" />

			<div className={styles.meta}>
				step {value} / {max}
			</div>

			{onSpeedChange && (
				<>
					<div className={styles.divider} aria-hidden="true" />
					<div className={styles.speedWrap} ref={speedRef}>
						<button
							type="button"
							className={styles.speedBtn}
							onClick={() => setSpeedOpen(s => !s)}
							aria-haspopup="listbox"
							aria-expanded={speedOpen}
							title="Playback speed"
						>
							{currentSpeedLabel}
						</button>
						{speedOpen && (
							<ul className={styles.speedMenu} role="listbox">
								{speedOptions.map(opt => (
									<li key={opt.value}>
										<button
											type="button"
											role="option"
											aria-selected={opt.value === speed}
											className={`${styles.speedItem} ${
												opt.value === speed ? styles.speedItemActive : ''
											}`}
											onClick={() => {
												onSpeedChange(opt.value);
												setSpeedOpen(false);
											}}
										>
											{opt.label}
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
				</>
			)}

			{rightSlot && (
				<>
					<div className={styles.divider} aria-hidden="true" />
					<div className={styles.right}>{rightSlot}</div>
				</>
			)}
		</div>
	);
};

export default StepControlBar;
