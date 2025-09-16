import styles from './Tabs.module.css';
import React, { useEffect, useRef, useState } from 'react';

const Tabs = ({ tabs, defaultActive = 0 }) => {
	const [activeIndex, setActiveIndex] = useState(defaultActive);
	const buttonRefs = useRef([]);
	const [indicatorStyle, setIndicatorStyle] = useState({});

	useEffect(() => {
		const activeButton = buttonRefs.current[activeIndex];
		if (activeButton) {
			setIndicatorStyle({
				left: activeButton.offsetLeft,
				width: activeButton.offsetWidth,
			});
		}
	}, [activeIndex, tabs]);

	return (
		<div className={styles.tabsContainer}>
			<div className={styles.tabHeaders}>
				{tabs.map((tab, i) => (
					<button
						key={i}
						ref={el => (buttonRefs.current[i] = el)}
						className={`${styles.tabButton} ${i === activeIndex ? styles.tabButtonActive : ''}`}
						onClick={() => setActiveIndex(i)}
					>
						{tab.label}
					</button>
				))}
				<div className={styles.tabIndicator} style={indicatorStyle} />
			</div>
			<div className={styles.tabContent}>
				<div
					className={styles.tabViewWrapper}
					style={{ transform: `translateX(-${activeIndex * 100}%)` }}
				>
					{tabs.map((tab, i) => (
						<div key={i} className={styles.tabView}>
							<div className={styles.tabViewContent}>
								{tab.content}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export default Tabs;
