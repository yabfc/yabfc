<script lang="ts">
	import Profile from '@/lib/models/profile';
	import { HammerIcon } from '@lucide/svelte';

	let { profile }: { profile: Profile } = $props();
</script>

<ul class="list">
	{#each profile.machines as machine (machine.id)}
		<li class="list-row">
			<div class="">
				<HammerIcon size="24" class="m-2" />
			</div>
			<div>
				<div>{machine.getDisplayName()}</div>
				<div class="text-xs font-semibold uppercase opacity-60">
					{machine.recipeCategories}
				</div>
			</div>
		</li>
	{:else}
		<p class="p-4">No machines found for this profile.</p>
	{/each}
</ul>
