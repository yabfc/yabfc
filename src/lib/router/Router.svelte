<script lang="ts">
	import { onMount, type Component } from 'svelte';

	let { routes }: { routes: { route: string; entry: Component }[] } = $props();

	let path = $state(''),
		active = $derived(routes.find(x => path.match(`^${x.route}/?$`)) ?? routes[0]);

	onMount(updateHash);

	function updateHash() {
		path = window.location.hash.slice(1) || '/';
	}
</script>

<svelte:window on:hashchange={updateHash} />

<active.entry />
