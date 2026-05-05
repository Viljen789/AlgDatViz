import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

export const useReducedMotion = () => {
	const [reduced, setReduced] = useState(() => {
		if (typeof window === 'undefined') return false;
		return window.matchMedia(QUERY).matches;
	});

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const mq = window.matchMedia(QUERY);
		const onChange = e => setReduced(e.matches);
		if (mq.addEventListener) mq.addEventListener('change', onChange);
		else mq.addListener(onChange);
		return () => {
			if (mq.removeEventListener) mq.removeEventListener('change', onChange);
			else mq.removeListener(onChange);
		};
	}, []);

	return reduced;
};

export default useReducedMotion;
