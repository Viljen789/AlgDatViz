import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	build: {
		rollupOptions: {
			output: {
				// Split stable third-party code into long-lived chunks so a
				// returning student's vendor cache survives app-code changes.
				// Order matters: match the more specific package paths
				// (react-dom, react-router-dom) before the bare `/react/`
				// segment so a loose substring never swallows them.
				manualChunks(id) {
					if (!id.includes('node_modules')) return undefined;

					if (
						id.includes('node_modules/react-dom/') ||
						id.includes('node_modules/react-router-dom/') ||
						id.includes('node_modules/react-router/') ||
						id.includes('node_modules/react/') ||
						id.includes('node_modules/scheduler/')
					) {
						return 'react-vendor';
					}

					if (id.includes('node_modules/gsap/')) {
						return 'gsap';
					}

					if (id.includes('node_modules/framer-motion/')) {
						return 'framer-motion';
					}

					// Everything else third-party lands in a generic vendor chunk.
					return 'vendor';
				},
			},
		},
	},
});
