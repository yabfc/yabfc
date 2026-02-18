import dagre from '@dagrejs/dagre';
import { Position, type Edge, type Node } from '@xyflow/svelte';

// TODO come up with something better to calculate the layout
const NODE_WIDTH = 200,
	NODE_HEIGHT = 160;

/** Layouts the nodes and edges and returns the updated elements. */
export default function layout(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
	const dagreGraph = new dagre.graphlib.Graph();
	dagreGraph.setDefaultEdgeLabel(() => ({}));

	dagreGraph.setGraph({ rankdir: 'LR' });

	edges.forEach(edge => dagreGraph.setEdge(edge.source, edge.target));
	nodes.forEach(node => {
		dagreGraph.setNode(node.id, {
			...node,
			width: node.measured?.width ?? NODE_WIDTH,
			height: node.measured?.height ?? NODE_WIDTH,
		});
	});

	dagre.layout(dagreGraph);

	return {
		nodes: nodes.map(node => {
			const nodeWithPosition = dagreGraph.node(node.id);
			// We are shifting the dagre node position (anchor=center center) to the top left
			// so it matches the Svelte Flow node anchor point (top left).
			return {
				...node,
				position: {
					x: nodeWithPosition.x - (node.measured?.width ?? NODE_WIDTH) / 2,
					y: nodeWithPosition.y - (node.measured?.height ?? NODE_HEIGHT) / 2,
				},
				sourcePosition: Position.Right,
				targetPosition: Position.Left,
			};
		}),
		edges: edges,
	};
}
