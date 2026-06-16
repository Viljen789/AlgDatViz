// examLog — the "have I forgotten this?" layer for the /exam practice route.
//
// The /exam page derives multi-part problems per topic and self-grades them into
// a ratio in [0,1]. That outcome is a distinct, exam-shaped signal from the SRS
// checks: it answers "could I do this *cold*, under exam conditions, today?" and
// it's the only signal an exam-only topic (e.g. graphs, which has no review bank)
// ever produces. This store keeps the latest + best ratio and an attempt count
// per topic so the mastery dashboard can fold it in and show decay.
//
// Mirrors activityLog.js exactly: a versioned localStorage key, a safe/validating
// read that migrates malformed or older shapes, a same-tab CustomEvent for live
// reads, fail-silent writes, and pure selectors. The record/clear/read surface is
// plain (no React) so ExamPage can record without coupling to it; useExamLog (at
// the foot of this file) is the live-read hook the ProgressPage subscribes with.

import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'algdatviz:exam:v1';
export const EXAM_EVENT = 'algdatviz:exam';

const emptyState = () => ({ topics: {} });

/** Clamp any input to a ratio in [0,1]; non-finite ⇒ 0. */
const clampRatio = value => {
	const n = Number(value);
	if (!Number.isFinite(n)) return 0;
	if (n < 0) return 0;
	if (n > 1) return 1;
	return n;
};

/**
 * The honest score sequence for a record (oldest sitting first), used to render
 * "the climb, not just today". When `raw.history` is a real array we clamp and
 * keep it. When it's absent (a record stored before sequences existed) we BACKFILL
 * only from numbers we actually have — never fabricating intermediate scores:
 *   • best > latest with >= 2 attempts ⇒ we genuinely saw a high-water mark AND a
 *     later (weaker) sitting, so [best, latest] are two real, distinct data points.
 *   • otherwise (one attempt, or best === latest) we only ever knew one number ⇒
 *     [latest]. A single point is honest: it yields no delta, which is correct.
 * The result is always non-empty so a record always has at least its latest score.
 */
const sanitizeHistory = (raw, latest, best, attempts) => {
	if (Array.isArray(raw.history)) {
		const clean = raw.history.filter(Number.isFinite).map(clampRatio);
		if (clean.length > 0) return clean;
	}
	// No stored sequence: reconstruct the minimum we can defend from latest/best.
	if (best > latest && attempts >= 2) return [best, latest];
	return [latest];
};

// One per-topic record. `meta` is an open bag (e.g. { score, total }) the caller
// may attach for display; it is stored verbatim and never read by the selectors.
const sanitizeTopic = raw => {
	if (!raw || typeof raw !== 'object') return null;
	const latest = clampRatio(raw.latest);
	const best = clampRatio(raw.best);
	const attemptsRaw = Number(raw.attempts);
	const attempts =
		Number.isFinite(attemptsRaw) && attemptsRaw > 0
			? Math.floor(attemptsRaw)
			: 1;
	const at = typeof raw.at === 'string' ? raw.at : null;
	return {
		latest,
		best: Math.max(best, latest),
		attempts,
		history: sanitizeHistory(raw, latest, Math.max(best, latest), attempts),
		at,
		...(raw.meta && typeof raw.meta === 'object' ? { meta: raw.meta } : {}),
	};
};

export const readExamLog = () => {
	if (typeof window === 'undefined') return emptyState();
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return emptyState();
		const parsed = JSON.parse(raw);
		// Migration: accept either the current { topics: {...} } shape or a bare
		// map of { topicId: record } from an earlier sketch — both normalize here.
		const source =
			parsed?.topics && typeof parsed.topics === 'object'
				? parsed.topics
				: parsed && typeof parsed === 'object'
					? parsed
					: {};
		const topics = {};
		for (const [topicId, record] of Object.entries(source)) {
			const clean = sanitizeTopic(record);
			if (clean) topics[topicId] = clean;
		}
		return { topics };
	} catch {
		return emptyState();
	}
};

const writeExamLog = next => {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
		// Same-tab live updates (storage events only fire cross-tab).
		window.dispatchEvent(new Event(EXAM_EVENT));
	} catch {
		// Storage unavailable (private mode, quota). Fail silent.
	}
};

/**
 * recordExamTopic — persist one finished exam for a topic.
 * Stores the latest ratio, keeps the running best, bumps the attempt count, and
 * stamps the day. `meta` (optional) is kept verbatim for display only.
 * Dispatches EXAM_EVENT for live reads. Called by ExamPage on submit.
 *
 * @param {string} topicId
 * @param {number} ratio    score in [0,1] (clamped)
 * @param {object} [meta]   optional display bag, e.g. { score, total }
 */
export const recordExamTopic = (topicId, ratio, meta) => {
	if (!topicId) return;
	const state = readExamLog();
	// readExamLog has already sanitized `prev`, so prev.history is a real sequence
	// (backfilled from latest/best for pre-sequence records). Appending this sitting
	// to it grows the honest climb without ever inventing intermediate scores.
	const prev = state.topics[topicId];
	const latest = clampRatio(ratio);
	const now = new Date();
	const at = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
		2,
		'0'
	)}-${String(now.getDate()).padStart(2, '0')}`;
	writeExamLog({
		...state,
		topics: {
			...state.topics,
			[topicId]: {
				latest,
				best: Math.max(latest, prev?.best ?? 0),
				attempts: (prev?.attempts ?? 0) + 1,
				history: [...(prev?.history ?? []), latest],
				at,
				...(meta && typeof meta === 'object' ? { meta } : {}),
			},
		},
	});
};

/** Reset the store. Called by the ProgressPage reset control. */
export const clearExamLog = () => writeExamLog(emptyState());

/**
 * examScoresFromState — the LATEST ratio per topic ("have I forgotten this?").
 * The latest (not best) is the honest decay signal: an old strong attempt should
 * not mask a recent weak one. Pure; returns { [topicId]: ratio }.
 *
 * @param {{topics:Record<string,{latest:number}>}} state
 * @returns {Record<string, number>}
 */
export const examScoresFromState = state => {
	const out = {};
	for (const [topicId, record] of Object.entries(state?.topics || {})) {
		if (record && Number.isFinite(record.latest)) out[topicId] = record.latest;
	}
	return out;
};

/**
 * topicDelta — the evidence-of-motion for one topic: how far its exam score has
 * moved since the FIRST recorded sitting. Honest by construction — it reads only
 * the stored sequence, so it can never claim a climb the data doesn't show.
 *
 * Returns null unless there are >= 2 real sittings (a single sitting is a point,
 * not a trend, so the dashboard shows no delta rather than a fake "+0"). When it
 * does return, `delta` is the signed change in ratio from first to latest and
 * `direction` is -1 | 0 | 1, so the UI can pair the number with a redundant glyph
 * (an arrow / +/- sign) and stay colour-blind-safe.
 *
 * @param {{history?:number[], latest?:number}} record  a sanitized topic record
 * @returns {{delta:number, first:number, latest:number, count:number,
 *           direction:-1|0|1} | null}
 */
export const topicDelta = record => {
	const history = Array.isArray(record?.history) ? record.history : [];
	if (history.length < 2) return null;
	const first = history[0];
	const latest = history[history.length - 1];
	const delta = latest - first;
	const direction = delta > 0 ? 1 : delta < 0 ? -1 : 0;
	return { delta, first, latest, count: history.length, direction };
};

/**
 * useExamLog — live read of the exam log (mirror of hooks/useActivity.js).
 * Subscribes to both cross-tab 'storage' and same-tab EXAM_EVENT so the progress
 * dashboard updates the moment an exam is finished elsewhere.
 *
 * @returns {{topics:object, examScores:Record<string,number>,
 *           examDeltas:Record<string,object>, reset:()=>void}}
 */
export const useExamLog = () => {
	const [state, setState] = useState(readExamLog);

	useEffect(() => {
		if (typeof window === 'undefined') return undefined;
		const refresh = () => setState(readExamLog());
		window.addEventListener('storage', refresh);
		window.addEventListener(EXAM_EVENT, refresh);
		return () => {
			window.removeEventListener('storage', refresh);
			window.removeEventListener(EXAM_EVENT, refresh);
		};
	}, []);

	const examScores = useMemo(() => examScoresFromState(state), [state]);

	// Per-topic deltas, keyed by topic id, only for topics with >= 2 sittings (the
	// rest are omitted so the dashboard naturally shows nothing for a lone sitting).
	// Each entry carries the `history` it was derived from so a caller can draw the
	// sparkline and the delta chip from one payload without re-reading the record.
	const examDeltas = useMemo(() => {
		const out = {};
		for (const [topicId, record] of Object.entries(state?.topics || {})) {
			const d = topicDelta(record);
			if (d) out[topicId] = { ...d, history: record.history };
		}
		return out;
	}, [state]);

	return { topics: state.topics, examScores, examDeltas, reset: clearExamLog };
};
