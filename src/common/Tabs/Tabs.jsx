import styles from './Tabs.module.css';
import { useEffect, useId, useRef, useState } from 'react';

/**
 * Tabs — token-wired primitive with an animated active indicator.
 *
 * tabs: Array<{ label, content, disabled? }>
 *
 * Keyboard: arrows move focus/selection between enabled tabs; Home/End jump.
 * States covered: hover / focus-visible / active (selected) / disabled.
 */
const Tabs = ({ tabs, defaultActive = 0, onChange }) => {
	const [activeIndex, setActiveIndex] = useState(defaultActive);
	const buttonRefs = useRef([]);
	const [indicatorStyle, setIndicatorStyle] = useState({});
	const baseId = useId();

	useEffect(() => {
		const activeButton = buttonRefs.current[activeIndex];
		if (activeButton) {
			setIndicatorStyle({
				left: activeButton.offsetLeft,
				width: activeButton.offsetWidth,
			});
		}
	}, [activeIndex, tabs]);

	const select = index => {
		if (tabs[index]?.disabled) return;
		setActiveIndex(index);
		onChange?.(index);
	};

	const handleKeyDown = event => {
		const count = tabs.length;
		let next = null;
		if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = 1;
		else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = -1;
		else if (event.key === 'Home') next = 'home';
		else if (event.key === 'End') next = 'end';
		if (next === null) return;
		event.preventDefault();

		let target = activeIndex;
		if (next === 'home') target = 0;
		else if (next === 'end') target = count - 1;
		else {
			// step over disabled tabs
			for (let i = 0; i < count; i++) {
				target = (target + next + count) % count;
				if (!tabs[target]?.disabled) break;
			}
		}
		select(target);
		buttonRefs.current[target]?.focus();
	};

	return (
		<div className={styles.tabsContainer}>
			<div className={styles.tabHeaders} role="tablist" onKeyDown={handleKeyDown}>
				{tabs.map((tab, i) => {
					const selected = i === activeIndex;
					return (
						<button
							key={i}
							ref={el => (buttonRefs.current[i] = el)}
							id={`${baseId}-tab-${i}`}
							role="tab"
							type="button"
							aria-selected={selected}
							aria-controls={`${baseId}-panel-${i}`}
							tabIndex={selected ? 0 : -1}
							disabled={tab.disabled}
							className={`${styles.tabButton} ${selected ? styles.tabButtonActive : ''}`}
							onClick={() => select(i)}
						>
							{tab.label}
						</button>
					);
				})}
				<div className={styles.tabIndicator} style={indicatorStyle} />
			</div>
			<div className={styles.tabContent}>
				<div
					className={styles.tabViewWrapper}
					style={{ transform: `translateX(-${activeIndex * 100}%)` }}
				>
					{tabs.map((tab, i) => (
						<div
							key={i}
							id={`${baseId}-panel-${i}`}
							role="tabpanel"
							aria-labelledby={`${baseId}-tab-${i}`}
							aria-hidden={i !== activeIndex}
							className={styles.tabView}
						>
							<div className={styles.tabViewContent}>{tab.content}</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export default Tabs;
