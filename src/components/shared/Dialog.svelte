<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		dialog = $bindable(),
		children,
		extraClass = '',
	}: { children?: Snippet; dialog?: HTMLDialogElement; extraClass?: string } = $props();
</script>

<dialog bind:this={dialog} class="modal">
	<div class="modal-box {extraClass}">
		{@render children?.()}
	</div>

	<form method="dialog" class="modal-backdrop">
		<button>Close</button>
	</form>
</dialog>
