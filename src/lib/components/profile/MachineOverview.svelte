<script lang="ts">
	import type Machine from '@/lib/models/machine';
	import { HammerIcon } from '@lucide/svelte';

	let { machines }: { machines: Machine[] } = $props();
</script>

<ul class="list">
	{#each machines as machine (machine.id)}
		<li class="list-row">
			<div class="">
				<HammerIcon size="24" class="m-2" />
			</div>
			<div>
				<div>{machine.name || machine.id}</div>
				<div class="text-xs font-semibold uppercase opacity-60">
					{machine.recipeCategories}
				</div>
			</div>
		</li>
	{:else}
		<p class="p-4">No machines found for this profile.</p>
	{/each}
</ul>
