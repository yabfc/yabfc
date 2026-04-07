<script lang="ts">
	import type { ItemIo } from '@/lib/factory/recipeNode';
	import active from '@/stores/active.svelte';
	import { AnvilIcon } from '@lucide/svelte';
	import { Handle, Position, type Node, type NodeProps } from '@xyflow/svelte';

	let { data, sourcePosition = Position.Right }: NodeProps<Node<{ item: ItemIo }>> = $props();

	const item = $derived(active.profile?.getItemById(data.item.id));
</script>

<div
	class="rounded-box bg-base-100 border-base-content/10 flex w-56 flex-col items-center gap-1 border p-4"
>
	<AnvilIcon size="32" class="text-secondary/70" />

	<span class="w-full overflow-hidden text-center text-lg font-bold text-ellipsis">
		{item?.getDisplayName() || data.item.id}
	</span>

	<div class="pt-4">
		<label class="floating-label">
			<span>Amount</span>
			<input type="number" bind:value={data.item.amount} class="input input-sm" />
		</label>
	</div>
</div>

<Handle
	type="source"
	position={sourcePosition}
	class="border-base-content/50 rounded-full border [--xy-handle-background-color:color-mix(in_oklab,var(--color-base-content)_50%,transparent)]"
/>
