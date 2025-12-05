export interface BaseItemIo {
	id: string;
	type: 'item' | 'fluid';
	amount: number;
}

export default interface Recipe {
	id: string;
	name?: string;
	in: BaseItemIo[];
	out: BaseItemIo[];
	duration: number;
	category: string;
}
