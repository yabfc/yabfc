<script lang="ts">
	import type { ItemIo, ItemIoNodeData } from '@/lib/models/factory';
	import active from '@/stores/active.svelte';
	import { AnvilIcon } from '@lucide/svelte';
	import { Handle, Position, type Node, type NodeProps } from '@xyflow/svelte';

	let { data, targetPosition = Position.Left }: NodeProps<Node<ItemIoNodeData>> = $props();

	const item = $derived(active.profile?.getItemById(data.item.id));

	let amount = $state(0);

	$effect(() => {
		amount = data.item.amount;
	});

	function handleInput() {
		data.onAmountChange(data.item.id, Number(amount) || 0);
	}
</script>

<Handle
	type="target"
	position={targetPosition}
	class="border-base-content/50 rounded-full border [--xy-handle-background-color:color-mix(in_oklab,var(--color-base-content)_50%,transparent)]"
/>

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
			<input
				type="number"
				bind:value={amount}
				onchange={handleInput}
				class="input input-sm"
			/>
		</label>
	</div>
</div>
