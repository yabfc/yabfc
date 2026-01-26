<script lang="ts">
	import { Search } from '@lucide/svelte';

	let { value = $bindable() } = $props();
	function clearSearch() {
		value = '';
	}
</script>

<div class="border-base-200 fixed p-1">
	<label class="input input-sm gap-2">
		<Search size="16" class="opacity-50"></Search>
		<input type="text" class="grow" placeholder="Search ..." bind:value />
		{#if value.length > 0}
			<button type="button" class="btn btn-ghost btn-xs btn-circle" onclick={clearSearch}>
				✕
			</button>
		{/if}
	</label>
</div>
