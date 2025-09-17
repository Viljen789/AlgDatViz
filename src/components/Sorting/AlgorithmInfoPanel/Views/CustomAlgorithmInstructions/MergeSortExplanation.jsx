// src/components/Sorting/AlgorithmInfoPanel/Views/MergeSortExplanation.jsx
import styles from './MergeSortExplanation.module.css';

const getExplanationText = meta => {
	const { phase, operation, range, target, left, right } = meta || {};
	if (phase === 'initializing')
		return {
			title: '🚀 Starter Merge Sort',
			description:
				'Alle elementer starter ved roten. Vi deler listen rekursivt til hver del bare inneholder ett element, og fletter dem deretter sammen i sortert rekkefølge.',
			action: 'Klar for å starte oppdelingsfasen...',
		};
	if (phase === 'dividing' && operation === 'divide') {
		const rangeText = `[${range[0]}-${range[1]}]`;
		const leftText = `[${left[0]}-${left[1]}]`;
		const rightText = `[${right[0]}-${right[1]}]`;
		return {
			title: '📂 Deler Opp Listen',
			description: `Deler området ${rangeText} i to mindre deler: ${leftText} og ${rightText}.`,
			action: 'Elementene flyter ned til sine respektive barnenoder.',
		};
	}
	if (phase === 'merging') {
		const targetText = `[${target[0]}-${target[1]}]`;
		const leftText = `[${left[0]}-${left[1]}]`;
		const rightText = `[${right[0]}-${right[1]}]`;
		if (operation === 'merge_prepare')
			return {
				title: '🔄 Forbereder Fletting',
				description: `Klar til å flette ${leftText} og ${rightText} sammen til målområdet ${targetText}.`,
				action: 'Skal starte sammenligning og fletting...',
			};
		if (operation === 'comparing') {
			const [leftVal, rightVal] = meta.comparingValues || ['?', '?'];
			return {
				title: '⚖️ Sammenligner Elementer',
				description: `Sammenligner ${leftVal} fra venstre side med ${rightVal} fra høyre side.`,
				action: `Den minste verdien (${Math.min(leftVal, rightVal)}) vil bli plassert i det flettede resultatet.`,
			};
		}
		if (operation?.includes('move_from')) {
			const side = operation.includes('left') ? 'venstre' : 'høyre';
			return {
				title: `⬅️ Tar fra ${side}`,
				description: `Element ${meta.movedElement || '?'} fra ${side} side er minst, og flyttes opp til foreldrenoden.`,
				action: `${side.charAt(0).toUpperCase() + side.slice(1)} side vinner sammenligningen!`,
			};
		}
		if (operation?.includes('remaining'))
			return {
				title: '🏃 Flytter Resterende',
				description:
					'En side er tom, så vi flytter alle gjenværende elementer fra den andre siden.',
				action: 'Ingen flere sammenligninger trengs - kopierer bare resten!',
			};
		if (operation === 'merge_complete')
			return {
				title: '✅ Fletting Fullført',
				description: `Flettet ${leftText} og ${rightText} til et sortert område ${targetText}.`,
				action: 'Denne delen er nå sortert! Går opp i rekursjonstreet...',
			};
	}
	if (phase === 'completed')
		return {
			title: '🎉 Sortering Fullført!',
			description:
				"Hele listen er nå sortert ved hjelp av 'del og hersk'-prinsippet.",
			action: 'Alle elementer er i sine endelige, sorterte posisjoner!',
		};
	return {
		title: 'Flettesortering Visualisering',
		description: "Følg den rekursive 'del og hersk'-prosessen...",
		action: '',
	};
};

const MergeSortExplanation = ({ currentFrame }) => {
	const explanation = getExplanationText(currentFrame?.metadata);
	return (
		<div className={styles.explanationPanel}>
			<h3 className={styles.explanationTitle}>{explanation.title}</h3>
			<p className={styles.explanationDescription}>{explanation.description}</p>
			{explanation.action && (
				<div className={styles.explanationAction}>{explanation.action}</div>
			)}
		</div>
	);
};

export default MergeSortExplanation;
