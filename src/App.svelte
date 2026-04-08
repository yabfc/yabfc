<script lang="ts">
	import Navbar from '@/components/Navbar.svelte';
	import Alerts from '@/components/shared/Alerts.svelte';
	import ThemeHandler from '@/components/ThemeHandler.svelte';
	import Router from '@/router/Router.svelte';
	import routes from '@/routes';
</script>

<main>
	<Navbar />

	<Router {routes} />

	<Alerts />

	<ThemeHandler />
</main>
