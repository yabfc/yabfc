export default interface Item {
	id: string;
	name?: string;
	type: 'item' | 'fluid';
	category: string;
	stackSize: number;
}
