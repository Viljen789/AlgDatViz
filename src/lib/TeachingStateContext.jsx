import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { decodePlaygroundState } from './teachingState.js';
import { TeachingStateContext } from './teachingStateRegistry.js';

export const TeachingStateProvider = forwardRef(
	({ encodedState, children }, ref) => {
		const initialState = useMemo(
			() => decodePlaygroundState(encodedState) ?? {},
			[encodedState]
		);
		const snapshots = useRef({});
		const value = useMemo(
			() => ({
				initialState,
				register(namespace, snapshot) {
					snapshots.current[namespace] = snapshot;
				},
			}),
			[initialState]
		);

		useImperativeHandle(ref, () => ({
			getSnapshot: () => ({ ...snapshots.current }),
		}));

		return (
			<TeachingStateContext.Provider value={value}>
				{children}
			</TeachingStateContext.Provider>
		);
	}
);

TeachingStateProvider.displayName = 'TeachingStateProvider';
