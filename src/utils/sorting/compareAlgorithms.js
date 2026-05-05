import { ALGORITHM_INFO } from './algorithmInfo.js';
import { ALGORITHM_META, ALGORITHM_ORDER } from './algorithmMeta.js';
import { SORTING_FUNCTIONS } from './sortingFunctions.js';

const getFinalStats = result => {
	const fallbackStats = result?.steps?.at(-1)?.stats || {};
	return result?.finalStats || fallbackStats;
};

export const compareSortingAlgorithms = (
	values,
	algorithmOrder = ALGORITHM_ORDER
) => {
	const input = Array.isArray(values) ? values : [];

	return algorithmOrder
		.map(key => {
			const sort = SORTING_FUNCTIONS[key];
			if (!sort) return null;

			const result = sort([...input]);
			const stats = getFinalStats(result);
			const writes = stats.writes ?? stats.swaps ?? 0;
			const swaps = stats.swaps ?? 0;
			const auxiliaryWrites = stats.auxiliaryWrites ?? 0;
			const totalOperations =
				stats.totalOperations ??
				(stats.comparisons ?? 0) + writes + auxiliaryWrites;

			return {
				key,
				name: ALGORITHM_INFO[key]?.name || key,
				complexity: ALGORITHM_META[key]?.complexity || '',
				steps: result?.steps?.length || 0,
				comparisons: stats.comparisons ?? 0,
				writes,
				swaps,
				auxiliaryWrites,
				totalOperations,
			};
		})
		.filter(Boolean)
		.sort((a, b) => {
			if (a.totalOperations !== b.totalOperations) {
				return a.totalOperations - b.totalOperations;
			}
			if (a.steps !== b.steps) return a.steps - b.steps;
			return a.name.localeCompare(b.name);
		})
		.map((row, index) => ({
			...row,
			rank: index + 1,
		}));
};

