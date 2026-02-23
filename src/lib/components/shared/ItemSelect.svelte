<!--
@component
Renders a item multi-select with amount. Item selection via dialog.
-->

<script lang="ts">
	import Dialog from '@/lib/components/shared/Dialog.svelte';
	import Search from '@/lib/components/shared/Search.svelte';
	import Item from '@/lib/models/item';
	import active from '@/lib/stores/active.svelte';
	import { AnvilIcon, PlusIcon, Trash2Icon } from '@lucide/svelte';

	let { items = $bindable([]) }: { items: { item: Item; amount: number }[] } = $props();

	let dialog = $state<HTMLDialogElement>();

	let searchQuery = $state('');
	const filteredItems = $derived(
		active.profile?.items.filter(
			x =>
				active.profile!.getRecipesByItemOutputId(x.id).filter(r => r.craftable !== false)
					.length > 0 &&
				(x.getDisplayName().toLowerCase().includes(searchQuery.toLowerCase()) ||
					x.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
					x.category.includes(searchQuery.toLowerCase())),
		) ?? [],
	);

	function openAddItemsDialog() {
		dialog?.showModal();
	}

	function addItemCreator(id: string) {
		return () => {
			const item = active.profile?.getItemById(id);
			if (!item) return;

			items = [...items, { item, amount: 1 }];
		};
	}

	function removeItemAtIndexCreator(i: number) {
		return () => {
			items = items.toSpliced(i, 1);
		};
	}
</script>

<div>
	{#each items as item, i}
		<div class="flex min-w-0 gap-2 truncate pb-2">
			<p class="grow content-center truncate text-sm font-semibold">
				<!-- TODO properly truncate -->
				{item.item.getDisplayName()}
			</p>

			<input type="number" bind:value={item.amount} min="1" class="input input-sm w-16" />

			<button
				onclick={removeItemAtIndexCreator(i)}
				class="btn btn-sm btn-square btn-error btn-soft"
			>
				<span class="sr-only">Remove Item</span>
				<Trash2Icon size="18" />
			</button>
		</div>
	{/each}

	<button onclick={openAddItemsDialog} class="link">Add items</button>
</div>

<Dialog bind:dialog>
	<h3 class="text-lg font-bold">Add Items</h3>

	<Search bind:value={searchQuery} />

	<ul class="list h-96 max-h-full overflow-auto">
		{#each filteredItems as item (item.id)}
			<li class="list-row">
				<AnvilIcon class="m-2" />

				<div>
					<div>{item.getDisplayName()}</div>
					<div class="text-xs font-semibold uppercase opacity-60">
						{item.category}
					</div>
				</div>

				<div>
					<button
						onclick={addItemCreator(item.id)}
						class="btn btn-square btn-soft btn-primary"
					>
						<PlusIcon />
					</button>
				</div>
			</li>
		{:else}
			<p class="p-4 text-center">No items found.</p>
		{/each}
	</ul>
</Dialog>
