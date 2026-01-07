<script lang="ts">
	import type Item from '@/lib/models/item';
	import { AnvilIcon } from '@lucide/svelte';

	let { items }: { items: Item[] } = $props();
</script>

<ul class="list">
	{#each items as item (item.id)}
		<li class="list-row">
			<div class="">
				<AnvilIcon size="24" class="m-2" />
			</div>
			<div>
				<div>{item.name}</div>
				<!-- <div class="text-xs font-semibold uppercase opacity-60">TODO</div> -->
			</div>
		</li>
	{:else}
		<p class="p-4">No items found for this profile.</p>
	{/each}
</ul>
