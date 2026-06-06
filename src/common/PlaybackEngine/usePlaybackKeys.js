// PlaybackEngine — scoped keyboard control for a single player.
//
// THE BUG THIS FIXES
// StepControlBar used to register a *global* window keydown listener for
// space / ← / →. The moment two playgrounds are mounted at once (e.g. the
// merge-sort lesson playground + the embedded multi-algorithm sandbox), a
// single keypress fired BOTH players. This hook scopes the keys to one
// container so only the active/focused player responds.
//
// HOW SCOPING WORKS
// The listener is attached to `window` (so shortcuts still feel native), but
// each handler bails unless the player container is the *active* one:
//
//   • If the container has focus-within (a child is focused) or the pointer is
//     hovering it, that container is active — keys go there.
//   • Otherwise, if NO container is currently hovered/focused, the single
//     "default" container handles keys. This keeps single-player ergonomics
//     global (you don't have to click a tiny button first), while still letting
//     hover / focus disambiguate when several players are on the page.
//
// A tiny module-level registry tracks every mounted player and resolves which
// one is the default, so two mounted playgrounds never double-fire.
//
// USAGE
//   const ref = useRef(null);
//   usePlaybackKeys(ref, { onPlayPause, onStepBack, onStepForward,
//                          onFirst, onLast, enabled: true });
//   return <div ref={ref} tabIndex={-1}>…</div>;
//
// KEYS
//   Space       → onPlayPause
//   ← / →       → onStepBack / onStepForward
//   Home / End  → onFirst / onLast
//   Typing in an <input>/<textarea>/<select>/contentEditable is ignored, and
//   the range slider keeps its native arrow behaviour.

import { useEffect, useRef } from 'react';

// Registry of mounted player containers, in mount order, so we can pick a
// deterministic "default" when nothing is hovered/focused.
const registry = [];

const isEditableTarget = target => {
	if (!target) return false;
	const tag = target.tagName;
	if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
	if (target.isContentEditable) return true;
	return false;
};

const isHovered = node =>
	!!node && typeof node.matches === 'function' && node.matches(':hover');

const hasFocusWithin = node => !!node && node.contains(document.activeElement);

// Is this node the one that should handle a global keypress right now?
const isActivePlayer = node => {
	if (!node) return false;
	// Direct interaction wins.
	if (hasFocusWithin(node) || isHovered(node)) return true;
	// Otherwise, if no player is being interacted with, the first registered
	// (and still connected) player is the default handler.
	const anyInteracted = registry.some(
		n => n.isConnected && (hasFocusWithin(n) || isHovered(n))
	);
	if (anyInteracted) return false;
	const defaultNode = registry.find(n => n.isConnected);
	return defaultNode === node;
};

export const usePlaybackKeys = (containerRef, handlers = {}) => {
	// Keep the freshest handlers without re-subscribing the listener each render.
	const handlersRef = useRef(handlers);
	handlersRef.current = handlers;

	const enabled = handlers.enabled ?? true;

	// Register/unregister this player's container so the default-handler
	// resolution above can see it.
	useEffect(() => {
		if (!enabled) return;
		const node = containerRef?.current;
		if (!node) return;
		registry.push(node);
		return () => {
			const i = registry.indexOf(node);
			if (i !== -1) registry.splice(i, 1);
		};
	}, [containerRef, enabled]);

	useEffect(() => {
		if (!enabled) return;

		const onKey = e => {
			const {
				onPlayPause,
				onStepBack,
				onStepForward,
				onFirst,
				onLast,
				enabled: stillEnabled = true,
			} = handlersRef.current;
			if (!stillEnabled) return;

			const node = containerRef?.current;
			if (!node) return;
			if (!isActivePlayer(node)) return;

			// Never hijack typing or native slider arrow control.
			if (isEditableTarget(e.target)) return;

			switch (e.key) {
				case ' ':
				case 'Spacebar': // legacy key name
					e.preventDefault();
					onPlayPause?.();
					break;
				case 'ArrowLeft':
					e.preventDefault();
					onStepBack?.();
					break;
				case 'ArrowRight':
					e.preventDefault();
					onStepForward?.();
					break;
				case 'Home':
					if (onFirst) {
						e.preventDefault();
						onFirst();
					}
					break;
				case 'End':
					if (onLast) {
						e.preventDefault();
						onLast();
					}
					break;
				default:
					break;
			}
		};

		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
		// Re-subscribe only when enabled flips or the ref identity changes.
	}, [containerRef, enabled]);
};

export default usePlaybackKeys;
