<script lang="ts">
	import Navbar from '@/lib/components/Navbar.svelte';
	import Router from '@/lib/router/Router.svelte';
	import routes from '@/routes';
</script>

<main>
	<Navbar />

	<Router {routes} />
</main>
