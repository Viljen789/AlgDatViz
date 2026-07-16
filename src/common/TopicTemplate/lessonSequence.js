const TRACE_COPY = {
	pseudocode: {
		label: 'Trace code',
		detail: 'State and pseudocode move together',
	},
	model: {
		label: 'Experiment',
		detail: 'Change inputs and compare outcomes',
	},
};

/**
 * Build the shared five-beat route shown at the start of every canonical topic.
 * The shell owns the sequence; curriculum metadata only selects the honest
 * trace wording for lessons that teach through a model rather than pseudocode.
 */
export const buildLessonSequence = ({
	topicId,
	sceneCount = 0,
	hasPlayground = false,
	traceMode = 'pseudocode',
}) => {
	const trace = TRACE_COPY[traceMode] || TRACE_COPY.pseudocode;
	const scenes = Number.isFinite(sceneCount) ? Math.max(0, sceneCount) : 0;

	return [
		{
			id: 'objective',
			label: 'Objective',
			detail: 'Frame the central idea',
		},
		{
			id: 'visualize',
			label: 'Visualize',
			detail:
				scenes > 0
					? `${scenes} guided scene${scenes === 1 ? '' : 's'}`
					: 'Build the mental model',
			href: '#topic-visualization',
		},
		...(hasPlayground
			? [
					{
						id: 'trace',
						label: trace.label,
						detail: trace.detail,
						href: '#topic-playground',
					},
				]
			: []),
		{
			id: 'checkpoint',
			label: 'Checkpoint',
			detail: 'Recall it without hints',
			href: '#lesson-checkpoint',
		},
		{
			id: 'exam',
			label: 'Exam',
			detail: 'Try exam-shaped questions',
			to: `/exam?topic=${topicId}`,
		},
	];
};

export default buildLessonSequence;
