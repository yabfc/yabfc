export interface ItemInterface {
	id: string;
	name?: string;
	type: 'item' | 'fluid';
	category: string;
	stackSize: number;
}

export default class Item {
	id: string;
	name?: string;
	type: 'item' | 'fluid';
	category: string;
	stackSize: number;

	constructor(item: ItemInterface) {
		this.id = item.id;
		this.name = item.name;
		this.type = item.type;
		this.category = item.category;
		this.stackSize = item.stackSize;
	}

	getDisplayName(): string {
		return (
			this.name ??
			this.id
				.split('-')
				.map(w => w[0].toUpperCase() + w.slice(1))
				.join(' ')
		);
	}
}
