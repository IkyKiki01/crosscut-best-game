// navigation.js — owns the waypoint graph, patrol routes and the breadth-first routing query.
const NODE_LAYOUT = [
  { x: -12, z: -13, links: [1] },
  { x: -12, z: -5, links: [0, 2, 7] },
  { x: -12, z: 5, links: [1, 3] },
  { x: -12, z: 13, links: [2, 4] },
  { x: 0, z: 13, links: [3, 5] },
  { x: 6, z: 13, links: [4, 6] },
  { x: 6, z: 5, links: [5, 8] },
  { x: -3, z: -5, links: [1, 8] },
  { x: 6, z: -5, links: [6, 7, 10] },
  { x: 10, z: -13, links: [11] },
  { x: 14, z: -4, links: [8, 11] },
  { x: 14, z: -13, links: [9, 10] },
];

const ROUTE_LAYOUT = [
  { name: "A site / turbine", nodes: [0, 1, 2, 3, 4, 3, 2, 1] },
  { name: "B site / capacitor", nodes: [9, 11, 10, 8, 6, 5, 6, 8, 10, 11] },
  { name: "Mid / crosscut", nodes: [7, 8, 6, 5, 4, 3, 2, 1, 0, 1] },
  { name: "A / crosscut flank", nodes: [0, 1, 7, 8, 6, 5, 4, 3, 2, 1] },
  { name: "B / mid flank", nodes: [9, 11, 10, 8, 7, 1, 7, 8, 10, 11] },
  { name: "Mid / south control", nodes: [7, 8, 6, 5, 4, 3, 2, 1] },
];

/**
 * Waypoint graph nodes with their symmetric link indices.
 * @type {Array<{x: number, z: number, links: number[]}>}
 */
export const NODES = NODE_LAYOUT;

/**
 * Named patrol routes, each a sequence of node indices.
 * @type {Array<{name: string, nodes: number[]}>}
 */
export const ROUTES = ROUTE_LAYOUT;

// BFS scratch storage is created once. Rotators route around the spine via the graph.
const queue = new Int16Array(NODES.length);
const parent = new Int16Array(NODES.length);

/**
 * Finds the graph node closest to a point.
 * @param {number} x query x
 * @param {number} z query z
 * @returns {number} node index
 */
function nearestNode(x, z) {
  let bestIndex = 0;
  let bestDistance = Infinity;
  for (let nodeIndex = 0; nodeIndex < NODES.length; nodeIndex++) {
    const node = NODES[nodeIndex];
    const distance = (node.x - x) ** 2 + (node.z - z) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = nodeIndex;
    }
  }
  return bestIndex;
}

/**
 * Fills the shared parent table with a breadth-first tree from the start node.
 * @param {number} start starting node index
 * @param {number} goal node index that ends the search early
 * @returns {void}
 */
function buildBreadthFirstTree(start, goal) {
  parent.fill(-1);
  let readIndex = 0;
  let writeIndex = 1;
  queue[0] = start;
  parent[start] = start;
  while (readIndex < writeIndex) {
    const nodeIndex = queue[readIndex++];
    if (nodeIndex === goal) break;
    const links = NODES[nodeIndex].links;
    for (let linkIndex = 0; linkIndex < links.length; linkIndex++) {
      const nextIndex = links[linkIndex];
      if (parent[nextIndex] < 0) {
        parent[nextIndex] = nodeIndex;
        queue[writeIndex++] = nextIndex;
      }
    }
  }
}

/**
 * Returns the first hop of the shortest route from a position to a target.
 * @param {number} x current x
 * @param {number} z current z
 * @param {number} targetX destination x
 * @param {number} targetZ destination z
 * @returns {{x: number, z: number}} waypoint the mover should steer toward
 */
export function nextNode(x, z, targetX, targetZ) {
  const start = nearestNode(x, z);
  const goal = nearestNode(targetX, targetZ);

  buildBreadthFirstTree(start, goal);

  let nodeIndex = goal;
  while (parent[nodeIndex] >= 0 && parent[nodeIndex] !== start && nodeIndex !== start) {
    nodeIndex = parent[nodeIndex];
  }
  return NODES[nodeIndex];
}
