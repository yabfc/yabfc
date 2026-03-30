import Factory from '@/pages/Factory.svelte';
import Index from '@/pages/Index.svelte';
import Profile from '@/pages/Profile.svelte';
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
		route: '/p/([a-zA-Z0-9_-]+)',
		entry: Profile,
	},
	{
		route: '/f/([a-zA-Z0-9_-]+)',
		entry: Factory,
	},
] satisfies { route: string; entry: Component<{ pathParams: string[] }> | Component }[];
