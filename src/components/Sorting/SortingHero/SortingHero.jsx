import { useEffect, useState } from 'react';
import { ChevronDown, Shuffle } from 'lucide-react';
import styles from './SortingHero.module.css';
import { ALGORITHM_INFO } from '../../../utils/sorting';
import {
	ALGORITHM_META,
	SIZE_OPTIONS,
} from '../../../utils/sorting/algorithmMeta';
import { getProfilesForAlgorithm } from '../../../utils/sorting/dataProfiles';
import AlgorithmPicker from '../AlgorithmPicker/AlgorithmPicker';
import ReadMoreOverlay from '../ReadMoreOverlay/ReadMoreOverlay';

const SortingHero = ({
	sortingAlgorithm,
	setSortingAlgorithm,
	arraySize,
	setArraySize,
	dataProfile,
	setDataProfile,
	shuffleArray,
	isSorting,
	statusSuffix,
	onStoryRequest,
}) => {
	const [pickerOpen, setPickerOpen] = useState(false);
	const [readMoreOpen, setReadMoreOpen] = useState(false);
	const [sizeOpen, setSizeOpen] = useState(false);
	const [profileOpen, setProfileOpen] = useState(false);

	useEffect(() => {
		if (!sizeOpen && !profileOpen) return;
		const onKey = e => {
			if (e.key === 'Escape') {
				setSizeOpen(false);
				setProfileOpen(false);
			}
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [profileOpen, sizeOpen]);

	const info = ALGORITHM_INFO[sortingAlgorithm];
	const meta = ALGORITHM_META[sortingAlgorithm] || {};
	const oneLine = meta.oneLine || '';
	const complexity = meta.complexity || info?.complexity?.time?.average || '';
	const profileOptions = getProfilesForAlgorithm(sortingAlgorithm);
	const activeProfile =
		profileOptions.find(option => option.value === dataProfile) ||
		profileOptions[0];

	return (
		<header className={styles.hero}>
			<div className={styles.left}>
				<button
					type="button"
					className={styles.title}
					onClick={() => setPickerOpen(true)}
					aria-haspopup="dialog"
					title="Choose algorithm"
				>
					<span className={styles.titleText}>{info?.name || 'Sorting'}</span>
					<ChevronDown
						size={20}
						strokeWidth={1.75}
						className={styles.titleChevron}
					/>
				</button>
				<p className={styles.oneLine}>{oneLine}</p>
			</div>

			<div className={styles.right}>
				<div className={styles.notation} aria-label="Complexity and size">
					<span className={styles.complexity}>{complexity}</span>
					<span className={styles.notationDot}>·</span>
					<button
						type="button"
						className={styles.sizeBtn}
						onClick={() => setSizeOpen(s => !s)}
						aria-haspopup="listbox"
						aria-expanded={sizeOpen}
						title="Array size"
					>
						<span>n = {arraySize}</span>
						<ChevronDown size={12} strokeWidth={2} />
					</button>
					{sizeOpen && (
						<>
							<div
								className={styles.sizeBackdrop}
								onClick={() => setSizeOpen(false)}
							/>
							<ul className={styles.sizeMenu} role="listbox">
								{SIZE_OPTIONS.map(opt => (
									<li key={opt.value}>
										<button
											type="button"
											role="option"
											aria-selected={opt.value === arraySize}
											className={`${styles.sizeItem} ${
												opt.value === arraySize ? styles.sizeItemActive : ''
											}`}
											onClick={() => {
												setArraySize(opt.value);
												setSizeOpen(false);
											}}
										>
											n = {opt.label}
										</button>
									</li>
								))}
							</ul>
						</>
					)}
					<span className={styles.notationDot}>·</span>
					<button
						type="button"
						className={styles.profileBtn}
						onClick={() => setProfileOpen(s => !s)}
						aria-haspopup="listbox"
						aria-expanded={profileOpen}
						title="Data profile"
					>
						<span>{activeProfile?.shortLabel || 'profile'}</span>
						<ChevronDown size={12} strokeWidth={2} />
					</button>
					{profileOpen && (
						<>
							<div
								className={styles.sizeBackdrop}
								onClick={() => setProfileOpen(false)}
							/>
							<ul className={styles.profileMenu} role="listbox">
								{profileOptions.map(opt => (
									<li key={opt.value}>
										<button
											type="button"
											role="option"
											aria-selected={opt.value === dataProfile}
											className={`${styles.profileItem} ${
												opt.value === dataProfile
													? styles.profileItemActive
													: ''
											}`}
											onClick={() => {
												setDataProfile(opt.value);
												setProfileOpen(false);
											}}
										>
											<span>{opt.label}</span>
											<small>{opt.description}</small>
										</button>
									</li>
								))}
							</ul>
						</>
					)}
					{statusSuffix && (
						<>
							<span className={styles.notationDot}>·</span>
							<span className={styles.status}>{statusSuffix}</span>
						</>
					)}
				</div>

				<div className={styles.actions}>
					{onStoryRequest && (
						<button
							type="button"
							className={styles.ghostBtn}
							onClick={onStoryRequest}
						>
							Story mode
						</button>
					)}
					<button
						type="button"
						className={styles.ghostBtn}
						onClick={() => setReadMoreOpen(true)}
					>
						Read more
					</button>
					<button
						type="button"
						className={styles.ghostBtn}
						onClick={shuffleArray}
						disabled={isSorting}
						title="Shuffle the array"
					>
						<Shuffle size={14} strokeWidth={2} />
						<span>Shuffle</span>
					</button>
				</div>
			</div>

			<AlgorithmPicker
				isOpen={pickerOpen}
				onClose={() => setPickerOpen(false)}
				value={sortingAlgorithm}
				onChange={algo => {
					setSortingAlgorithm(algo);
					setPickerOpen(false);
				}}
			/>

			<ReadMoreOverlay
				isOpen={readMoreOpen}
				onClose={() => setReadMoreOpen(false)}
				algorithm={sortingAlgorithm}
			/>
		</header>
	);
};

export default SortingHero;
