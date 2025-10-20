import Index from '@/lib/pages/Index.svelte';
import Profile from '@/lib/pages/Profile.svelte';
import Settings from '@/lib/pages/Settings.svelte';
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
		route: '/p/(\\w+)',
		entry: Profile,
	},
] satisfies { route: string; entry: Component<{ pathParams: string[] }> | Component }[];
