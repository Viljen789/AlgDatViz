import { useContext, useEffect, useRef } from 'react';
import { TeachingStateContext } from './teachingStateRegistry.js';

/** Register serializable playground state and restore it once from the URL. */
export const useTeachingStateSnapshot = (namespace, snapshot, restore) => {
	const context = useContext(TeachingStateContext);
	const restored = useRef(false);
	const restoreRef = useRef(restore);
	restoreRef.current = restore;

	useEffect(() => {
		if (!context || restored.current) return;
		if (!(namespace in context.initialState)) {
			restored.current = true;
			return;
		}
		const didRestore = restoreRef.current?.(context.initialState[namespace]);
		if (didRestore !== false) restored.current = true;
	}, [context, namespace, snapshot]);

	useEffect(() => {
		context?.register(namespace, snapshot);
	}, [context, namespace, snapshot]);
};
