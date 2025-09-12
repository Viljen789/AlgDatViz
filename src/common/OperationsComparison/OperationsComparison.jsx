// src/components/Sorting/OperationsComparison/OperationsComparison.jsx
import {useMemo} from 'react';
import {CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import styles from './OperationsComparison.module.css';

const StatCard = ({ label, value }) => (
    <div className={styles.statCard}>
        <h4>{label}</h4>
        <span>{value}</span>
    </div>
);

// Helper function to calculate theoretical operations for a given step
const calculateTheoreticalOps = (step, totalSteps, arraySize) => {
    if (arraySize <= 1 || totalSteps === 0) return { on2: 0, onlogn: 0, on: 0 };

    // Calculate progress as a fraction of completion
    const progress = step / totalSteps;

    // For theoretical curves, we want to show the mathematical progression
    const n = arraySize;
    const currentN = Math.ceil(progress * n); // Simulate processing portion of array

    return {
        on2: Math.round(currentN * currentN * 0.5), // Typical for bubble sort
        onlogn: Math.round(currentN * Math.log2(Math.max(currentN, 1))),
        on: currentN
    };
};

const OperationsComparison = ({ operationStats, algorithmInfo, arraySize, isSorting }) => {
    // Memoize the chart data calculation
    const chartData = useMemo(() => {
        if (!operationStats || !Array.isArray(operationStats) || operationStats.length === 0) {
            return [];
        }

        const totalSteps = operationStats[operationStats.length - 1]?.step || 1;

        // Sample data points for performance - only show every nth point if too many
        const maxPoints = 100; // Limit chart points for performance
        const sampleRate = Math.max(1, Math.floor(operationStats.length / maxPoints));

        return operationStats
            .filter((_, index) => index % sampleRate === 0 || index === operationStats.length - 1)
            .map(stat => {
                const theoretical = calculateTheoreticalOps(stat.step, totalSteps, arraySize);

                return {
                    name: `Step ${stat.step}`,
                    step: stat.step,
                    'Actual Operations': stat.totalOperations,
                    'O(n²)': theoretical.on2,
                    'O(n log n)': theoretical.onlogn,
                    'O(n)': theoretical.on
                };
            });
    }, [operationStats, arraySize]);

    // Memoize final stats
    const finalStats = useMemo(() => {
        return operationStats && operationStats.length > 0
            ? operationStats[operationStats.length - 1]
            : null;
    }, [operationStats]);

    // Memoize expected operations calculation
    const expectedOperations = useMemo(() => {
        if (!algorithmInfo || arraySize <= 1) return 0;

        const complexity = algorithmInfo?.complexity?.time?.average || 'O(n²)';
        const n = arraySize;

        switch (complexity) {
            case 'O(n²)': return Math.round(n * n * 0.5); // More realistic for bubble sort
            case 'O(n log n)': return Math.round(n * Math.log2(n));
            case 'O(n)': return n;
            default: return Math.round(n * n * 0.5);
        }
    }, [algorithmInfo, arraySize]);

    if (!operationStats || !Array.isArray(operationStats) || operationStats.length === 0) {
        return (
            <div className={styles.comparisonContainer}>
                <div className={styles.placeholder}>
                    <h4>Performance Analysis</h4>
                    <p>Run a sorting algorithm to see its performance analysis and complexity chart.</p>
                </div>
            </div>
        );
    }

    if (!finalStats) return null;

    const expectedComplexity = algorithmInfo?.complexity?.time?.average || 'O(n²)';

    return (
        <div className={styles.comparisonContainer}>
            <div className={styles.statsGrid}>
                <StatCard
                    label="Total Operations"
                    value={finalStats.totalOperations.toLocaleString()}
                />
                <StatCard
                    label={`Expected (${expectedComplexity})`}
                    value={expectedOperations.toLocaleString()}
                />
                <StatCard
                    label="Comparisons"
                    value={finalStats.comparisons.toLocaleString()}
                />
                <StatCard
                    label="Array Writes"
                    value={finalStats.arrayWrites.toLocaleString()}
                />
            </div>

            <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis
                            dataKey="step"
                            type="number"
                            domain={['dataMin', 'dataMax']}
                            stroke="var(--color-text-secondary)"
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => `${value}`}
                        />
                        <YAxis
                            stroke="var(--color-text-secondary)"
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => value > 1000 ? `${(value/1000).toFixed(1)}k` : value}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--border-radius-md)',
                                boxShadow: '0 4px 12px var(--shadow-color)',
                            }}
                            formatter={(value, name) => [value?.toLocaleString(), name]}
                            labelFormatter={(value) => `Step ${value}`}
                        />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="Actual Operations"
                            stroke="var(--color-primary)"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={!isSorting}
                        />
                        <Line
                            type="monotone"
                            dataKey="O(n²)"
                            stroke="var(--color-error)"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            dot={false}
                            isAnimationActive={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="O(n log n)"
                            stroke="var(--color-warning)"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            dot={false}
                            isAnimationActive={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="O(n)"
                            stroke="var(--color-success)"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            dot={false}
                            isAnimationActive={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default OperationsComparison;
