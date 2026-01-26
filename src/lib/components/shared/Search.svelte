<script lang="ts">
	import { SearchIcon, XIcon } from '@lucide/svelte';

	let { value = $bindable() } = $props();

	const clearSearch = () => (value = '');
</script>

<div class="p-3">
	<label class="input input-sm sticky top-0">
		<SearchIcon size="14" class="" />

		<input type="search" bind:value placeholder="Search" class="grow" />

		<div class="size-6">
			{#if value.length > 0}
				<button class="btn btn-ghost btn-xs btn-square" onclick={clearSearch}>
					<XIcon size="12" />
				</button>
			{/if}
		</div>
	</label>
</div>
