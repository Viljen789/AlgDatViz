import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { BUILT_TOPICS } from '../data/curriculum.js';
import styles from './TopicFinder.module.css';

// A quiet index that sits directly under the hero so a reader can find an exact
// topic in seconds, without scrolling down to the animated spine. A single
// labelled text field filters every built topic by case-insensitive substring
// over its name, nav label, phase, AND its algorithm keywords — so searching
// "huffman", "dijkstra", or "knapsack" surfaces the topic that teaches it, not
// just topics whose title happens to match. Matches render as a compact,
// scannable grid of chips. Each chip is a real route link (so it works without
// JS) and marks the topic visited on click, mirroring HomePage's own handler.
//
// `markVisited` is passed in from HomePage so this section shares the page's
// single progress source (one localStorage-backed hook instance) rather than
// subscribing a second time.
const matches = (topic, needle) => {
	if (!needle) return true;
	const haystack =
		`${topic.name} ${topic.navLabel} ${topic.phase} ${topic.keywords ?? ''}`.toLowerCase();
	return haystack.includes(needle);
};

const TopicFinder = ({ markVisited }) => {
	const navigate = useNavigate();
	const [query, setQuery] = useState('');
	const chipRefs = useRef([]);

	const needle = query.trim().toLowerCase();

	// The curriculum spine already shows every topic. This command surface stays
	// quiet until the learner asks for something, then returns a bounded set.
	const results = useMemo(
		() =>
			needle
				? BUILT_TOPICS.filter(topic => matches(topic, needle)).slice(0, 6)
				: [],
		[needle]
	);

	const clear = () => setQuery('');

	const onInputKeyDown = event => {
		if (event.key === 'Escape') {
			event.preventDefault();
			clear();
		} else if (event.key === 'Enter') {
			// Enter on the field opens the top current match.
			const top = results[0];
			if (top) {
				event.preventDefault();
				markVisited?.(top.id);
				navigate(top.to);
			}
		} else if (event.key === 'ArrowDown') {
			// Step down into the grid from the field.
			const first = chipRefs.current[0];
			if (first) {
				event.preventDefault();
				first.focus();
			}
		}
	};

	// Arrow-key roving between chips, mirroring HomePage's onKeyNavigate pattern.
	const onChipKeyDown = (event, idx) => {
		if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
			const next = chipRefs.current[idx + 1];
			if (next) {
				event.preventDefault();
				next.focus();
			}
		} else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
			event.preventDefault();
			const prev = chipRefs.current[idx - 1];
			if (prev) prev.focus();
		} else if (event.key === 'Escape') {
			clear();
		}
	};

	return (
		<section className={styles.finder} aria-labelledby="topic-finder-heading">
			<header className={styles.header}>
				<p className={styles.eyebrow}>Jump to a topic</p>
				<h2 id="topic-finder-heading" className={styles.heading}>
					Find your topic
				</h2>
				<p className={styles.sub}>
					Type a topic, an algorithm (&ldquo;huffman&rdquo;,
					&ldquo;dijkstra&rdquo;), or a phase to filter all{' '}
					{BUILT_TOPICS.length} topics. Press Enter to open the first match.
				</p>
			</header>

			<div className={styles.searchRow}>
				<Search
					className={styles.searchIcon}
					size={16}
					strokeWidth={2}
					aria-hidden="true"
				/>
				<input
					type="text"
					className={styles.input}
					value={query}
					onChange={event => setQuery(event.target.value)}
					onKeyDown={onInputKeyDown}
					placeholder="Search topics or algorithms, e.g. huffman, dijkstra"
					aria-label="Search topics"
					aria-describedby="topic-finder-count"
					autoComplete="off"
					spellCheck="false"
				/>
			</div>

			<p id="topic-finder-count" className={styles.count} aria-live="polite">
				{needle ? `${results.length} matching topics` : `${BUILT_TOPICS.length} topics indexed`}
			</p>

			{!needle ? (
				<p className={styles.idle}>Search by name, phase, or algorithm. The full teaching order continues below.</p>
			) : results.length === 0 ? (
				<p className={styles.empty}>No topic matches. Try another word.</p>
			) : (
				<ul className={styles.grid}>
					{results.map((topic, idx) => (
						<li key={topic.id} className={styles.cell}>
							<Link
								to={topic.to}
								className={styles.chip}
								ref={node => {
									chipRefs.current[idx] = node;
								}}
								onKeyDown={event => onChipKeyDown(event, idx)}
								onClick={() => markVisited?.(topic.id)}
								style={{
									'--chip-accent': topic.accent,
									'--chip-wash': `var(--topic-${topic.tokenId}-wash)`,
								}}
							>
								<span className={styles.chipTop}>
									<span className={styles.chipNum}>{topic.number}</span>
									<span
										className={styles.chipDot}
										aria-hidden="true"
									/>
								</span>
								<span className={styles.chipName}>{topic.name}</span>
								<span className={styles.chipMeta}>{topic.complexity}</span>
							</Link>
						</li>
					))}
				</ul>
			)}
		</section>
	);
};

export default TopicFinder;
