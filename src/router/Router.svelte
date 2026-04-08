<script lang="ts">
	import { onMount, type Component } from 'svelte';

	interface Props {
		routes: { route: string; entry: Component<{ pathParams: string[] }> | Component }[];
	}
	let { routes }: Props = $props();

	let path = $state('');
	const matchRoute = (x: string) => path.match(`^${x}/?$`);

	let active = $derived(routes.find(x => matchRoute(x.route)) ?? routes[0]),
		pathParams = $derived(matchRoute(active.route)?.slice(1) ?? []);

	onMount(updateHash);

	function updateHash() {
		path = window.location.hash.slice(1) || '/';
	}
</script>

<svelte:window on:hashchange={updateHash} />

<active.entry {pathParams} />
