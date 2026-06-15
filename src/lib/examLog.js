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

// One per-topic record. `meta` is an open bag (e.g. { score, total }) the caller
// may attach for display; it is stored verbatim and never read by the selectors.
const sanitizeTopic = raw => {
	if (!raw || typeof raw !== 'object') return null;
	const latest = clampRatio(raw.latest);
	const best = clampRatio(raw.best);
	const attempts = Number(raw.attempts);
	const at = typeof raw.at === 'string' ? raw.at : null;
	return {
		latest,
		best: Math.max(best, latest),
		attempts:
			Number.isFinite(attempts) && attempts > 0 ? Math.floor(attempts) : 1,
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
 * useExamLog — live read of the exam log (mirror of hooks/useActivity.js).
 * Subscribes to both cross-tab 'storage' and same-tab EXAM_EVENT so the progress
 * dashboard updates the moment an exam is finished elsewhere.
 *
 * @returns {{topics:object, examScores:Record<string,number>, reset:()=>void}}
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

	return { topics: state.topics, examScores, reset: clearExamLog };
};
