<script lang="ts">
	import Navbar from '@/lib/components/Navbar.svelte';
	import Alerts from '@/lib/components/shared/Alerts.svelte';
	import ThemeHandler from '@/lib/components/ThemeHandler.svelte';
	import Router from '@/lib/router/Router.svelte';
	import routes from '@/routes';
</script>

<main>
	<Navbar />

	<Router {routes} />

	<Alerts />

	<ThemeHandler />
</main>
