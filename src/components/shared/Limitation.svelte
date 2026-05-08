<script lang="ts">
	import { formattedLimitations } from '@/lib/format/limitation';
	let { limitations = $bindable([]) }: { limitations: string[] } = $props();
</script>

{#each formattedLimitations(limitations) as limit}
	<div
		class="alert alert-warning bg-warning/20 text-warning mt-2 w-full border-none py-1 text-xs shadow-none"
	>
		<span class="-ml-1">{limit}</span>
	</div>
{/each}
