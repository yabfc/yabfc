<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		dialog = $bindable(),
		children,
		extraClass = '',
		onClose,
	}: {
		children?: Snippet;
		dialog?: HTMLDialogElement;
		extraClass?: string;
		onClose?: () => void;
	} = $props();
</script>

<dialog bind:this={dialog} onclose={() => onClose?.()} class="modal">
	<div class="modal-box {extraClass}">
		{@render children?.()}
	</div>

	<form method="dialog" class="modal-backdrop">
		<button>Close</button>
	</form>
</dialog>
