export const buildBst = values =>
	values.reduce((root, value) => insertValue(root, value), null);

export const insertValue = (root, value) => {
	if (root == null) {
		return { value, left: null, right: null };
	}
	if (value === root.value) return root;
	if (value < root.value) {
		return { ...root, left: insertValue(root.left, value) };
	}
	return { ...root, right: insertValue(root.right, value) };
};

const minNode = node => {
	let current = node;
	while (current?.left) current = current.left;
	return current;
};

export const deleteValue = (root, value) => {
	if (root == null) return null;
	if (value < root.value) {
		return { ...root, left: deleteValue(root.left, value) };
	}
	if (value > root.value) {
		return { ...root, right: deleteValue(root.right, value) };
	}
	if (!root.left) return root.right;
	if (!root.right) return root.left;

	const successor = minNode(root.right);
	return {
		value: successor.value,
		left: root.left,
		right: deleteValue(root.right, successor.value),
	};
};

export const containsValue = (root, value) => {
	let current = root;
	while (current) {
		if (current.value === value) return true;
		current = value < current.value ? current.left : current.right;
	}
	return false;
};

export const getSearchSteps = (root, value) => {
	const steps = [];
	const path = [];
	let current = root;

	while (current) {
		path.push(String(current.value));
		if (current.value === value) {
			steps.push({
				title: `Found ${value}`,
				description: `${value} matches the current node, so the search stops.`,
				activeNodes: [String(current.value)],
				pathNodes: [...path],
				output: [...path],
				line: 1,
			});
			return steps;
		}

		const goLeft = value < current.value;
		steps.push({
			title: `${value} ${goLeft ? '<' : '>'} ${current.value}`,
			description: goLeft
				? `Move left because smaller values live in ${current.value}'s left subtree.`
				: `Move right because larger values live in ${current.value}'s right subtree.`,
			activeNodes: [String(current.value)],
			pathNodes: [...path],
			output: [...path],
			line: goLeft ? 2 : 4,
		});
		current = goLeft ? current.left : current.right;
	}

	steps.push({
		title: `${value} is absent`,
		description: 'The search fell off the tree, so this value is not stored.',
		activeNodes: [],
		pathNodes: [...path],
		output: [...path],
		line: 0,
	});
	return steps;
};

export const getTraversalSteps = (root, traversalType) => {
	const steps = [];
	const output = [];

	const visit = node => {
		output.push(String(node.value));
		steps.push({
			title: `Visit ${node.value}`,
			description: `${node.value} is appended to the ${traversalType} traversal output.`,
			activeNodes: [String(node.value)],
			pathNodes: [...output],
			output: [...output],
			line:
				traversalType === 'inorder'
					? 1
					: traversalType === 'preorder'
						? 0
						: traversalType === 'postorder'
							? 2
							: 3,
		});
	};

	const inorder = node => {
		if (!node) return;
		inorder(node.left);
		visit(node);
		inorder(node.right);
	};

	const preorder = node => {
		if (!node) return;
		visit(node);
		preorder(node.left);
		preorder(node.right);
	};

	const postorder = node => {
		if (!node) return;
		postorder(node.left);
		postorder(node.right);
		visit(node);
	};

	const levelorder = node => {
		if (!node) return;
		const queue = [node];
		while (queue.length) {
			const current = queue.shift();
			visit(current);
			if (current.left) queue.push(current.left);
			if (current.right) queue.push(current.right);
		}
	};

	const traversals = { inorder, preorder, postorder, levelorder };
	traversals[traversalType]?.(root);

	return steps.length
		? steps
		: [
				{
					title: 'Empty tree',
					description: 'There are no nodes to traverse.',
					activeNodes: [],
					pathNodes: [],
					output: [],
					line: 0,
				},
			];
};

export const getTreeStats = root => {
	const walk = node => {
		if (!node) return { count: 0, leaves: 0, height: 0, balanced: true };
		const left = walk(node.left);
		const right = walk(node.right);
		return {
			count: left.count + right.count + 1,
			leaves: !node.left && !node.right ? 1 : left.leaves + right.leaves,
			height: Math.max(left.height, right.height) + 1,
			balanced:
				left.balanced &&
				right.balanced &&
				Math.abs(left.height - right.height) <= 1,
		};
	};
	return walk(root);
};

export const getTreeLayout = root => {
	const nodes = [];
	const edges = [];
	let order = 0;

	const visit = (node, depth) => {
		if (!node) return null;
		const left = visit(node.left, depth + 1);
		const x = 70 + order * 86;
		const y = 58 + depth * 92;
		order += 1;
		const current = {
			id: String(node.value),
			value: node.value,
			x,
			y,
			depth,
		};
		nodes.push(current);
		const right = visit(node.right, depth + 1);
		if (left) edges.push({ from: current, to: left });
		if (right) edges.push({ from: current, to: right });
		return current;
	};

	visit(root, 0);
	return {
		nodes,
		edges,
		width: Math.max(720, order * 86 + 140),
		height: Math.max(420, (Math.max(...nodes.map(node => node.depth), 0) + 1) * 108),
	};
};
