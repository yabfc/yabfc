import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
	plugins: [svelte()],
	server: { port: 4321 },
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
});
