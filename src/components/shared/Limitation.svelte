<script lang="ts">
	import { formattedLimitations } from '@/lib/format/limitation';
	let { limitations = $bindable([]) }: { limitations: string[] } = $props();
</script>

{#each formattedLimitations(limitations) as limit}
	<div class="alert alert-warning alert-soft mt-2 w-full py-1 text-xs">
		<span class="-ml-1">{limit}</span>
	</div>
{/each}
