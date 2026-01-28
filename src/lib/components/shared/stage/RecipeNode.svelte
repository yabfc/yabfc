<script lang="ts">
	import active from '@/lib/stores/active.svelte';
	import { FactoryIcon } from '@lucide/svelte';
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';

	let {
		data,
		targetPosition = Position.Left,
		sourcePosition = Position.Right,
	}: NodeProps = $props();
</script>

<Handle type="target" position={targetPosition} />

<div
	class="rounded-box bg-base-100 border-base-content/10 flex flex-col items-center gap-1 border p-3"
>
	<FactoryIcon size="28" class="text-secondary/70" />

	<span class="font-bold">Recipe Name</span>

	<ul class="text-base-content/80 flex flex-col gap-1 text-xs">
		{#snippet factory(name: string, amount: number, effectStrings: string[])}
			<li>
				<span class="text-base-content/50">{amount}x</span>
				{name}

				<p class="text-base-content/50 text-[0.5rem] font-semibold uppercase">
					{effectStrings.join(', ')}
				</p>
			</li>
		{/snippet}

		{@render factory('Factory Name', 2, ['effect'])}
	</ul>
</div>

<Handle type="source" position={sourcePosition} />
