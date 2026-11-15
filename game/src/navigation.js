// A connected waypoint graph. Route nodes sit in traversable corridors, not across cover.
export const NODES = [
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
export const ROUTES = [
  { name: "A site / turbine", nodes: [0, 1, 2, 3, 4, 3, 2, 1] },
  { name: "B site / capacitor", nodes: [9, 11, 10, 8, 6, 5, 6, 8, 10, 11] },
  { name: "Mid / crosscut", nodes: [7, 8, 6, 5, 4, 3, 2, 1, 0, 1] },
  { name: "A / crosscut flank", nodes: [0, 1, 7, 8, 6, 5, 4, 3, 2, 1] },
  { name: "B / mid flank", nodes: [9, 11, 10, 8, 7, 1, 7, 8, 10, 11] },
  { name: "Mid / south control", nodes: [7, 8, 6, 5, 4, 3, 2, 1] },
];
// BFS scratch storage is created once. Rotators route around the spine via the graph.
const queue = new Int16Array(NODES.length),
  parent = new Int16Array(NODES.length);
export function nextNode(x, z, tx, tz) {
  let start = 0,
    goal = 0,
    a = Infinity,
    b = Infinity;
  for (let i = 0; i < NODES.length; i++) {
    const n = NODES[i],
      d = (n.x - x) ** 2 + (n.z - z) ** 2,
      e = (n.x - tx) ** 2 + (n.z - tz) ** 2;
    if (d < a) {
      a = d;
      start = i;
    }
    if (e < b) {
      b = e;
      goal = i;
    }
  }
  parent.fill(-1);
  let read = 0,
    write = 1;
  queue[0] = start;
  parent[start] = start;
  while (read < write) {
    const id = queue[read++];
    if (id === goal) break;
    const links = NODES[id].links;
    for (let j = 0; j < links.length; j++) {
      const k = links[j];
      if (parent[k] < 0) {
        parent[k] = id;
        queue[write++] = k;
      }
    }
  }
  let id = goal;
  while (parent[id] >= 0 && parent[id] !== start && id !== start) id = parent[id];
  return NODES[id];
}
