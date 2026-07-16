import { TraceScrubber } from '@viljen789/study-ui';

/**
 * Adapts TopicScrolly's scene model to the shared algorithm timeline.
 * Playback state remains owned by TopicScrolly; the shared primitive owns the
 * interaction contract, keyboard scope, narration, and reduced-motion behavior.
 */
const SceneControlBar = ({
	total,
	active,
	isPlaying,
	scenes = [],
	sceneStatuses = [],
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
	if (!total || total <= 0) return null;

	const steps = Array.from({ length: total }, (_, index) => ({
		id: scenes[index]?.id ?? `scene-${index + 1}`,
		label: scenes[index]?.title ?? `Scene ${index + 1}`,
		status:
			sceneStatuses[index] === 'none' ? 'idle' : sceneStatuses[index] || 'idle',
	}));

	return (
		<TraceScrubber
			steps={steps}
			activeIndex={active}
			isPlaying={isPlaying}
			blockedReason={blockedReason}
			reducedMotion={reducedMotion}
			scopeRef={scopeRef}
			ariaLabel="Scene playback"
			style={{ '--sui-trace-accent': 'var(--topic-accent)' }}
			onChange={index => onJump?.(index)}
			onFirst={onFirst}
			onPrevious={onPrev}
			onNext={onNext}
			onLast={onLast}
			onTogglePlay={onTogglePlay}
		/>
	);
};

export default SceneControlBar;
