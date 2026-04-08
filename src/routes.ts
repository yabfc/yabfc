import Factory from '@/pages/Factory.svelte';
import Index from '@/pages/Index.svelte';
import Settings from '@/pages/Settings.svelte';
import type { Component } from 'svelte';

export default [
	{
		route: '/',
		entry: Index,
	},
	{
		route: '/settings',
		entry: Settings,
	},
	{
		route: '/f/([a-zA-Z0-9_-]+)',
		entry: Factory,
	},
] satisfies { route: string; entry: Component<{ pathParams: string[] }> | Component }[];
