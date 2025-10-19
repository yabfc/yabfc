<script lang="ts">
	import { ConstructionIcon } from '@lucide/svelte';

	let { pathParams }: { pathParams: string[] } = $props();
</script>

<div class="flex min-h-screen flex-col items-center justify-center gap-4 p-8 pt-28">
	<div>
		<ConstructionIcon size="150" class="opacity-30" />
	</div>

	<h2 class="text-base-content/70 text-4xl font-bold">Authorized personnel only!</h2>
</div>
