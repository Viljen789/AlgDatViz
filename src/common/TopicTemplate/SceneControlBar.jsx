import { useCallback, useEffect, useRef } from 'react';
import {
	ChevronFirst,
	ChevronLast,
	ChevronLeft,
	ChevronRight,
	Pause,
	Play,
} from 'lucide-react';
import styles from './SceneControlBar.module.css';

/**
 * SceneControlBar — explicit playback for the teaching scenes (Phase 2a).
 *
 * The locked interaction model: explicit controls are the PRIMARY way to move
 * through the concept scenes; scroll stays an optional convenience (the parent
 * IntersectionObserver still updates `active`). This bar never touches the
 * wheel/trackpad and never traps scroll — it only ever moves the active scene,
 * and the parent brings that scene into view via a user-initiated scrollIntoView.
 *
 * It is shared infra: every topic that renders <TopicScrolly> inherits it with
 * no per-topic change. It deliberately does NOT reuse the playground's
 * StepControlBar / PlaybackEngine (those are scoped to playgrounds and must not
 * regress); the keyboard scoping idea is reimplemented locally instead.
 *
 * Props
 * -----
 *   total        number of scenes (N).
 *   active       index of the active scene (0-based), owned by the parent.
 *   isPlaying    whether auto-advance is running.
 *   scenes       Array<{ id, title }> — for the scrubber's accessible labels.
 *   blockedReason optional string — when set, Play is disabled and the reason is
 *                announced (e.g. an unanswered check on the current scene).
 *   scopeRef     ref to the container keyboard control is scoped to (so keys only
 *                fire when the scrolly is hovered/focused, never while typing).
 *   reducedMotion when true, no auto-advance affordance leans on animation.
 *   onPrev / onNext / onFirst / onLast  step the active scene.
 *   onJump       (index) => void — jump straight to a scene (scrubber clicks).
 *   onTogglePlay () => void — start/stop auto-advance.
 */
const SceneControlBar = ({
	total,
	active,
	isPlaying,
	scenes = [],
	blockedReason = null,
	scopeRef = null,
	reducedMotion = false,
	onPrev,
	onNext,
	onFirst,
	onLast,
	onJump,
	onTogglePlay,
}) => {
	const barRef = useRef(null);

	const atStart = active <= 0;
	const atEnd = active >= total - 1;
	const playDisabled = total <= 1 || (!isPlaying && Boolean(blockedReason));

	// ── Local, scoped keyboard handler ──
	// Mirrors usePlaybackKeys' scoping idea (keys only when this scrolly is
	// hovered or holds focus, and never while typing in an input) without
	// editing that playground-owned hook. Attaches to window so shortcuts feel
	// native, but bails unless the scoped container is the active surface.
	const handlersRef = useRef({});
	handlersRef.current = {
		onPrev,
		onNext,
		onFirst,
		onLast,
		onTogglePlay,
		playDisabled,
	};

	useEffect(() => {
		const scope = scopeRef?.current || barRef.current;
		if (!scope) return undefined;

		const isEditable = target => {
			if (!target) return false;
			const tag = target.tagName;
			if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')
				return true;
			return Boolean(target.isContentEditable);
		};

		const isActiveSurface = () => {
			if (scope.contains(document.activeElement)) return true;
			return (
				typeof scope.matches === 'function' && scope.matches(':hover')
			);
		};

		const onKey = e => {
			if (!isActiveSurface()) return;
			if (isEditable(e.target)) return;
			const h = handlersRef.current;
			switch (e.key) {
				case 'ArrowLeft':
					e.preventDefault();
					h.onPrev?.();
					break;
				case 'ArrowRight':
					e.preventDefault();
					h.onNext?.();
					break;
				case 'Home':
					e.preventDefault();
					h.onFirst?.();
					break;
				case 'End':
					e.preventDefault();
					h.onLast?.();
					break;
				case ' ':
				case 'Spacebar':
					if (h.playDisabled) break;
					e.preventDefault();
					h.onTogglePlay?.();
					break;
				default:
					break;
			}
		};

		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [scopeRef]);

	const handleTogglePlay = useCallback(() => {
		if (playDisabled) return;
		onTogglePlay?.();
	}, [playDisabled, onTogglePlay]);

	if (!total || total <= 0) return null;

	const playTitle = isPlaying
		? 'Pause auto-advance (space)'
		: blockedReason
			? `Auto-advance paused — ${blockedReason}`
			: 'Auto-advance scenes (space)';

	return (
		<div
			ref={barRef}
			className={styles.bar}
			role="group"
			aria-label="Scene playback"
		>
			<div className={styles.controls} role="toolbar" aria-label="Scene controls">
				<button
					type="button"
					className={styles.btn}
					onClick={onFirst}
					disabled={atStart}
					aria-label="First scene"
					title="First scene (Home)"
				>
					<ChevronFirst size={16} strokeWidth={1.8} aria-hidden="true" />
				</button>
				<button
					type="button"
					className={styles.btn}
					onClick={onPrev}
					disabled={atStart}
					aria-label="Previous scene"
					title="Previous scene ( ← )"
				>
					<ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
				</button>
				<button
					type="button"
					className={`${styles.btn} ${styles.play}`}
					onClick={handleTogglePlay}
					disabled={playDisabled}
					aria-pressed={isPlaying}
					aria-label={isPlaying ? 'Pause auto-advance' : 'Auto-advance scenes'}
					title={playTitle}
				>
					{isPlaying ? (
						<Pause size={17} strokeWidth={1.8} fill="currentColor" aria-hidden="true" />
					) : (
						<Play size={17} strokeWidth={1.8} fill="currentColor" aria-hidden="true" />
					)}
				</button>
				<button
					type="button"
					className={styles.btn}
					onClick={onNext}
					disabled={atEnd}
					aria-label="Next scene"
					title="Next scene ( → )"
				>
					<ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
				</button>
				<button
					type="button"
					className={styles.btn}
					onClick={onLast}
					disabled={atEnd}
					aria-label="Last scene"
					title="Last scene (End)"
				>
					<ChevronLast size={16} strokeWidth={1.8} aria-hidden="true" />
				</button>
			</div>

			{/* Scrubber: one dot per scene, clickable + keyboardable jump targets. */}
			<div
				className={styles.scrubber}
				role="tablist"
				aria-label="Jump to scene"
			>
				{Array.from({ length: total }, (_, idx) => {
					const isActive = idx === active;
					const label = scenes[idx]?.title
						? `Scene ${idx + 1} of ${total}: ${scenes[idx].title}`
						: `Scene ${idx + 1} of ${total}`;
					return (
						<button
							key={scenes[idx]?.id ?? idx}
							type="button"
							role="tab"
							aria-selected={isActive}
							aria-current={isActive ? 'true' : undefined}
							className={`${styles.dot} ${isActive ? styles.dotActive : ''}`}
							onClick={() => onJump?.(idx)}
							title={label}
							aria-label={label}
						>
							<span className={styles.dotMark} aria-hidden="true" />
						</button>
					);
				})}
			</div>

			<p className={styles.meta} aria-live="polite">
				<span className={styles.metaCount}>
					{String(active + 1).padStart(2, '0')}
					<span className={styles.metaSep}> / </span>
					{String(total).padStart(2, '0')}
				</span>
				{isPlaying && !reducedMotion && (
					<span className={styles.metaPlaying}> · playing</span>
				)}
				{blockedReason && !isPlaying && (
					<span className={styles.metaBlocked}> · {blockedReason}</span>
				)}
			</p>
		</div>
	);
};

export default SceneControlBar;
