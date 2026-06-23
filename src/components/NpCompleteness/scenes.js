// The scrolly scenes that build the core intuition of the NP-completeness topic.
//
// The arc walks the conceptual capstone of TDT4120:
//   • P            — solvable in polynomial time.
//   • NP           — a YES-answer has a certificate checkable in polynomial time
//                    (verifying, not solving). "Easy to check, hard to find."
//   • NP-hard      — at least as hard as everything in NP (everything in NP
//                    reduces to it). It need NOT be in NP itself.
//   • NP-complete  — in NP AND NP-hard. The hardest problems that are still
//                    "checkable", and all inter-reducible.
//   • Reductions   — A ≤p B, and especially the DIRECTION: to SOLVE B you reduce
//                    TO B; to PROVE B hard you reduce a known-hard problem FROM A
//                    TO B. The wrong direction proves nothing.
//
// The synchronized stage (NpCompletenessStage) reacts to the active scene *by id*
// (not a fragile index) so the prose and the visualization stay in lockstep.
//
// Retrieval checks (not recognition-only): the numeric check is graded from the
// pure, unit-tested verify3SAT; the reduction-direction spotbug surfaces the
// exact mistake the pensum spends pages untangling.

export const SCENES = [
	{
		id: 'the-line',
		eyebrow: 'The big picture',
		title: 'Two kinds of hard: hard to solve, easy to check.',
		body: 'Some problems we can solve quickly — sort a list, find a shortest path — these live in P, solvable in time polynomial in the input. Others we only know how to solve by searching an exponential space, yet if someone hands us a candidate answer we can check it fast. That gap between solving and checking is the whole story of this topic.',
		check: {
			kind: 'choice',
			prompt: 'A problem is in P when…',
			options: [
				'a proposed answer can be checked in polynomial time',
				'it can be solved in polynomial time',
				'it has no known polynomial algorithm',
			],
			answer: 'it can be solved in polynomial time',
			misconceptions: {
				'a proposed answer can be checked in polynomial time':
					'That is the definition of NP, not P. P demands you can FIND the answer fast; checking a handed-to-you answer fast is the weaker NP promise. Conflating verifying with solving is the exact slip this topic exists to fix.',
				'it has no known polynomial algorithm':
					'That describes a problem we suspect is NOT in P, the opposite of the definition. P is membership by a positive guarantee (a poly-time algorithm exists), not by the absence of one.',
			},
			explanation:
				'P is the class of problems SOLVABLE in polynomial time. "Checkable in polynomial time" is the definition of NP — a related but weaker promise, which is exactly the distinction the next scene makes.',
		},
	},
	{
		id: 'np-is-verify',
		eyebrow: 'NP = a checkable certificate',
		title: 'NP: a yes-answer comes with a certificate you can verify fast.',
		body: 'A problem is in NP if every YES-instance has a certificate — a short proposed solution — that a verifier can check in polynomial time. Is this Boolean formula satisfiable? Hand me a truth assignment and I confirm it in one pass. Finding the assignment may need exponential search; checking one is cheap. NP is the class where checking is easy even when finding is (apparently) hard.',
		check: {
			kind: 'choice',
			prompt: 'Which property puts a decision problem in NP?',
			options: [
				'Every yes-instance has a polynomial-time-verifiable certificate',
				'It can be solved by brute force',
				'It is harder than every problem in P',
			],
			answer: 'Every yes-instance has a polynomial-time-verifiable certificate',
			misconceptions: {
				'It can be solved by brute force':
					'Nearly every problem yields to brute force given enough time, so that says nothing special. NP is about CHECKING a certificate in polynomial time, not about whether an exponential search eventually finds one.',
				'It is harder than every problem in P':
					'NP does not sit above P; it contains it (P ⊆ NP). Many NP problems are easy, and membership in NP is a verification promise, not a hardness ranking.',
			},
			explanation:
				'NP is defined by polynomial-time VERIFICATION of a certificate, not by how the certificate is found. Every problem in P is also in NP (you can verify by just re-solving), so P ⊆ NP. Whether P = NP is the open question.',
		},
	},
	{
		id: 'verify-it',
		eyebrow: 'Make it tangible',
		title: 'Check a certificate yourself — in one linear pass.',
		body: 'Take φ = (x₁ ∨ ¬x₂ ∨ x₃) ∧ (¬x₁ ∨ x₂ ∨ x₃) and the proposed certificate x₁ = true, x₂ = false, x₃ = false. To verify, walk the clauses once and ask whether each has a satisfied literal — the AND holds only if every clause does. No search, no backtracking, just a single scan. Commit to the verdict before the board scans it for you.',
		// predict (choice-mode), revealGate: the stage's VerifyBoard auto-paints the
		// per-clause check/cross verdict the instant this scene is active, so without
		// a gate it would spoil the answer. While the prediction is pending the board
		// holds an honest pre-scan frame (certificate shown, clauses not yet judged).
		//
		// The answer is DERIVED from the pure verify3SAT — the SAME verifier the board
		// (NpCompletenessStage's VerifyBoard) animates. For this φ and certificate:
		// clause 0 (x₁ ∨ ¬x₂ ∨ x₃) -> x₁=T satisfies; clause 1 (¬x₁ ∨ x₂ ∨ x₃) ->
		// ¬x₁=F, x₂=F, x₃=F, nothing satisfied. One clause fails, so the AND fails and
		// the verifier REJECTS. lessonPredict.test.js re-derives answer from verify3SAT.
		check: {
			kind: 'predict',
			revealGate: true,
			prompt:
				'Before the board scans it: does the verifier ACCEPT this certificate (φ is satisfied) or REJECT it?',
			options: ['Accepts', 'Rejects'],
			// DERIVED: verify3SAT(DEMO_FORMULA, {x1:true,x2:false,x3:false}).ok === false.
			answer: 'Rejects',
			misconceptions: {
				Accepts:
					'The first clause does pass on x₁ = true, which is tempting — but φ is an AND of clauses, so the verifier accepts only if EVERY clause holds. Clause 2 (¬x₁ ∨ x₂ ∨ x₃) has ¬x₁ = false, x₂ = false, x₃ = false: no true literal. One failing clause sinks the whole certificate, so the verifier rejects.',
			},
			explanation:
				'Clause 1 (x₁ ∨ ¬x₂ ∨ x₃) is satisfied by x₁ = true, but clause 2 (¬x₁ ∨ x₂ ∨ x₃) has no true literal, and φ is the AND of its clauses — so the verifier REJECTS this certificate. The point is not the verdict but the cost of reaching it: one linear pass over the clauses, no search. That is verification in polynomial time, which is exactly what "in NP" buys you.',
		},
	},
	{
		id: 'hard-vs-complete',
		eyebrow: 'The crucial distinction',
		title: 'NP-hard vs NP-complete: in NP, or just at-least-as-hard?',
		body: 'NP-hard means "at least as hard as everything in NP" — every NP problem reduces to it. That is all; an NP-hard problem need not even be in NP (the halting problem is NP-hard but not in NP). NP-complete is the sharper class: NP-hard AND in NP. So NP-complete = NP-hard ∩ NP. Those are the hardest problems we can still verify.',
		check: {
			kind: 'choice',
			prompt: 'A problem is NP-complete exactly when it is…',
			options: ['in NP and NP-hard', 'NP-hard but not in NP', 'in P and in NP'],
			answer: 'in NP and NP-hard',
			misconceptions: {
				'NP-hard but not in NP':
					'Dropping membership in NP leaves only NP-hard, which can be far harder, even undecidable (the halting problem is NP-hard). NP-completeness specifically requires the problem to also be verifiable, i.e. in NP.',
				'in P and in NP':
					'Every P problem is already in NP, so this just describes an easy problem. NP-complete needs NP-HARDNESS too, and an NP-complete problem is known to be in P only if P = NP.',
			},
			explanation:
				'NP-complete = in NP AND NP-hard. Drop "in NP" and you have only NP-hard (could be far harder, even unsolvable). The membership in NP is what keeps an NP-complete problem "checkable" — that is the whole point of the class.',
		},
	},
	{
		id: 'the-roster',
		eyebrow: 'The standard roster',
		title: 'The famous NP-complete problems — and what is merely easy.',
		body: 'SAT, 3-SAT, CLIQUE, VERTEX-COVER, INDEPENDENT-SET, HAMILTONIAN-CYCLE, TSP (decision), SUBSET-SUM — all NP-complete, all polynomially inter-reducible: a polynomial solver for any one would solve them all. Meanwhile shortest path, MST, and sorting sit comfortably in P. Telling the two groups apart is half the exam.',
		// classify: sort each problem into P vs NP-complete. Grounded in the pensum.
		check: {
			kind: 'classify',
			prompt: 'Sort each problem into the class it belongs to.',
			items: [
				{ id: 'sat', label: '3-SAT (satisfiability)' },
				{ id: 'vc', label: 'Vertex cover' },
				{ id: 'sp', label: 'Single-source shortest path' },
				{ id: 'mst', label: 'Minimum spanning tree' },
			],
			categories: [
				{ id: 'p', label: 'In P (poly-time solvable)' },
				{ id: 'npc', label: 'NP-complete' },
			],
			answer: {
				sat: 'npc',
				vc: 'npc',
				sp: 'p',
				mst: 'p',
			},
			explanation:
				'3-SAT and vertex cover are textbook NP-complete (and inter-reducible). Shortest path (Bellman-Ford / Dijkstra) and MST (Kruskal / Prim) have polynomial algorithms, so they are in P. Being able to place a problem on the right side of this line is the practical skill.',
		},
	},
	{
		id: 'reduction-tool',
		eyebrow: 'Reductions',
		title: 'A ≤p B: turn instances of A into instances of B.',
		body: 'A polynomial reduction A ≤p B is a poly-time map sending each instance of A to an instance of B with the same yes/no answer. It does two jobs depending on which way you point it. If you already have a fast solver for B, reducing A TO B gives you a fast solver for A — you use B. The direction is everything, and the next scene is where it usually goes wrong.',
		check: {
			kind: 'choice',
			prompt:
				'You have a polynomial solver for B and want to solve A. You should…',
			options: [
				'reduce A to B (A ≤p B), then run B’s solver',
				'reduce B to A (B ≤p A)',
				'prove A is NP-hard first',
			],
			answer: 'reduce A to B (A ≤p B), then run B’s solver',
			misconceptions: {
				'reduce B to A (B ≤p A)':
					'That points the arrow backward: B ≤p A would let B’s instances be solved by A, but you have a solver for B, not A. To USE B you must feed it A’s instances, i.e. A ≤p B.',
				'prove A is NP-hard first':
					'Hardness is irrelevant when you just want an answer. You already hold a fast solver for B, so the task is to route A into it (A ≤p B); proving A NP-hard is the separate, opposite-direction activity of the next scene.',
			},
			explanation:
				'To SOLVE A using B, map A’s instances into B (A ≤p B) and let B’s solver answer. The arrow points from the problem you want to solve toward the tool you already have. Proving hardness points the arrow the OTHER way — that is the next scene.',
		},
	},
	{
		id: 'wrong-direction',
		eyebrow: 'The mistake everyone makes',
		title: 'To prove B is NP-hard, reduce a known-hard problem TO B.',
		body: 'Hardness flows the opposite way from solving. To prove B is NP-hard you take a problem already known to be NP-hard — say 3-SAT — and reduce it TO B (3-SAT ≤p B). That shows B is at least as hard as 3-SAT. Reducing B to 3-SAT instead proves nothing about B’s hardness — it only shows B is no harder than 3-SAT, the wrong way round. Find the false claim below.',
		// spotbug (line-mode): a hardness "proof" with the direction inverted.
		check: {
			kind: 'spotbug',
			prompt:
				'Here is an attempted proof that problem B is NP-hard. Which step is wrong?',
			lines: [
				'1. Choose 3-SAT, a known NP-hard problem.',
				'2. Build a poly-time reduction from B to 3-SAT (B ≤p 3-SAT).',
				'3. So any 3-SAT solver could be used to solve B.',
				'4. Therefore B is NP-hard.',
			],
			answer: 1,
			explanation:
				'Step 2 reduces in the WRONG direction. B ≤p 3-SAT shows B is no harder than 3-SAT (it would put B in NP-ish company), not that B is hard. To prove B NP-hard you need 3-SAT ≤p B — reduce the known-hard problem INTO B. Step 4’s conclusion does not follow from a B ≤p 3-SAT reduction.',
		},
	},
	{
		id: 'worked-reduction',
		eyebrow: 'A reduction that works',
		title: '3-SAT ≤p Independent-Set: the correct hardness proof.',
		body: 'Here is the direction done right. Turn each clause into a triangle of literal-vertices (so an independent set picks at most one literal per clause), and join every x to every ¬x (so chosen literals never contradict). Set k = number of clauses. Then φ is satisfiable ⇔ the graph has an independent set of size k. Because 3-SAT ≤p Independent-Set, and Independent-Set is in NP, Independent-Set is NP-complete.',
		check: {
			kind: 'choice',
			prompt:
				'This reduction (3-SAT ≤p Independent-Set) lets us conclude that Independent-Set is…',
			options: [
				'NP-hard (and, being in NP, NP-complete)',
				'in P',
				'easier than 3-SAT',
			],
			answer: 'NP-hard (and, being in NP, NP-complete)',
			misconceptions: {
				'in P':
					'A reduction FROM a known-hard problem can only push a problem up, never into P. Concluding Independent-Set is in P would actually imply P = NP, since 3-SAT reduces into it.',
				'easier than 3-SAT':
					'The reduction direction proves the reverse: 3-SAT ≤p Independent-Set means Independent-Set is at least as hard as 3-SAT, not easier. Reading the inequality backward is the classic direction error.',
			},
			explanation:
				'Reducing the known-hard 3-SAT INTO Independent-Set proves Independent-Set is at least as hard as 3-SAT, i.e. NP-hard. Independent-Set is also in NP (a candidate vertex set is verified in polynomial time), so it is NP-complete. Direction + membership = the full argument.',
		},
	},
];
