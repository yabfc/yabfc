<script lang="ts">
	import Profile from '@/lib/models/profile';
	import { AnvilIcon } from '@lucide/svelte';

	let { profile }: { profile: Profile } = $props();
</script>

<ul class="list">
	{#each profile.items as item (item.id)}
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
