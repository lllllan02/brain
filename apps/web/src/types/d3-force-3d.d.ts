/** The subset of d3-force-3d 3.x used by both layout implementations. */
declare module 'd3-force-3d' {
  export interface SimNode {
    index?: number;
    x?: number;
    y?: number;
    z?: number;
    vx?: number;
    vy?: number;
    vz?: number;
    fx?: number | null;
    fy?: number | null;
    fz?: number | null;
  }
  export interface SimLink<N extends SimNode> {
    source: number | N;
    target: number | N;
    index?: number;
  }
  export interface Force<N extends SimNode> {
    (alpha: number): void;
    initialize?(nodes: N[], ...args: unknown[]): void;
  }
  export interface ManyBodyForce<N extends SimNode> extends Force<N> {
    strength(value: number): this;
    distanceMax(value: number): this;
  }
  export interface PositionForce<N extends SimNode> extends Force<N> {
    strength(value: number): this;
  }
  export interface LinkForce<N extends SimNode> extends Force<N> {
    distance(value: number): this;
    strength(value: number | ((link: SimLink<N>) => number)): this;
  }
  export interface Simulation<N extends SimNode> {
    alpha(): number;
    alpha(value: number): this;
    alphaMin(): number;
    alphaDecay(value: number): this;
    velocityDecay(value: number): this;
    force(name: string): Force<N> | undefined;
    force(name: string, force: Force<N> | null): this;
    stop(): this;
    tick(iterations?: number): this;
  }
  export function forceSimulation<N extends SimNode>(
    nodes: N[],
    dimensions?: number,
  ): Simulation<N>;
  export function forceLink<N extends SimNode>(links: SimLink<N>[]): LinkForce<N>;
  export function forceManyBody<N extends SimNode>(): ManyBodyForce<N>;
  export function forceX<N extends SimNode>(position: number): PositionForce<N>;
  export function forceY<N extends SimNode>(position: number): PositionForce<N>;
  export function forceZ<N extends SimNode>(position: number): PositionForce<N>;
}
