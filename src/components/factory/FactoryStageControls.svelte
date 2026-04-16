<script lang="ts">
	import { DownloadIcon, FullscreenIcon, ImportIcon, MinusIcon, PlusIcon } from '@lucide/svelte';
	import { useStore } from '@xyflow/svelte';

	let store = $derived(useStore());

	const zoomIn = () => store.zoomIn(),
		zoomOut = () => store.zoomOut(),
		fitView = () => store.fitView();

	const importFactory = () => {
		//
	};

	const exportFactory = () => {
		//
	};
</script>

<div class="bg-base-200 fixed bottom-4 left-1/2 z-10 flex -translate-x-1/2">
	<div class="join">
		<div class="tooltip" data-tip="Zoom in">
			<button onclick={zoomIn} class="join-item btn btn-ghost btn-sm btn-square">
				<PlusIcon size="18" />
				<span class="sr-only">Zoom in</span>
			</button>
		</div>

		<div class="tooltip" data-tip="Zoom out">
			<button onclick={zoomOut} class="join-item btn btn-ghost btn-sm btn-square">
				<MinusIcon size="18" />
				<span class="sr-only">Zoom out</span>
			</button>
		</div>

		<div class="tooltip" data-tip="Import">
			<button onclick={importFactory} class="join-item btn btn-ghost btn-sm btn-square">
				<ImportIcon size="18" />
				<span class="sr-only">Import</span>
			</button>
		</div>

		<div class="tooltip" data-tip="Export">
			<button onclick={exportFactory} class="join-item btn btn-ghost btn-sm btn-square">
				<DownloadIcon size="18" />
				<span class="sr-only">Export</span>
			</button>
		</div>

		<div class="tooltip" data-tip="Fit into view">
			<button onclick={fitView} class="join-item btn btn-ghost btn-sm btn-square">
				<FullscreenIcon size="18" />
				<span class="sr-only">Fit into view</span>
			</button>
		</div>
	</div>
</div>
