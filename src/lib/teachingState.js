export const TEACHING_STATE_VERSION = '2';
export const MAX_TEACHING_STATE_LENGTH = 16_000;

export const encodePlaygroundState = state => {
	try {
		const json = JSON.stringify(state ?? {});
		const bytes = new TextEncoder().encode(json);
		let binary = '';
		for (const byte of bytes) binary += String.fromCharCode(byte);
		const encoded = btoa(binary)
			.replaceAll('+', '-')
			.replaceAll('/', '_')
			.replace(/=+$/g, '');
		return encoded.length <= MAX_TEACHING_STATE_LENGTH ? encoded : null;
	} catch {
		return null;
	}
};

export const decodePlaygroundState = encoded => {
	if (
		typeof encoded !== 'string' ||
		encoded.length === 0 ||
		encoded.length > MAX_TEACHING_STATE_LENGTH
	)
		return null;
	try {
		const base64 = encoded.replaceAll('-', '+').replaceAll('_', '/');
		const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
		const binary = atob(padded);
		const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
		const parsed = JSON.parse(new TextDecoder().decode(bytes));
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
			? parsed
			: null;
	} catch {
		return null;
	}
};

export const nextTeachingSearch = (
	current,
	{ sceneId, present, playgroundState, fork } = {}
) => {
	const next = new URLSearchParams(current);
	next.set('v', TEACHING_STATE_VERSION);
	if (sceneId) next.set('scene', sceneId);
	if (present === true) next.set('present', '1');
	else if (present === false) next.delete('present');
	if (playgroundState !== undefined) {
		const encoded = encodePlaygroundState(playgroundState);
		if (encoded) next.set('state', encoded);
		else next.delete('state');
	}
	if (fork === true) next.set('fork', '1');
	else if (fork === false) next.delete('fork');
	return next;
};

export const teachingStateUrl = (
	href,
	current,
	{ sceneId, playgroundState } = {}
) => {
	const url = new URL(href);
	url.search = nextTeachingSearch(current, {
		sceneId,
		present: false,
		playgroundState,
		fork: false,
	}).toString();
	return url.toString();
};
