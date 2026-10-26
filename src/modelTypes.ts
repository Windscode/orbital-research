import type * as THREE from 'three';
import type { Vehicle, VehicleModel } from './types';

export type Point3 = [number, number, number];
/** Geometry builders share display-space primitives; these are not measured CAD units. */
export interface ModelBuilderContext {
  vehicle: Vehicle;
  model: VehicleModel;
  available: Set<string>;
  SILVER: string; DARK: string; GOLD: string; BLUE: string; GREEN: string;
  group(id: string, direction?: THREE.Vector3): THREE.Group;
  mesh(g: THREE.Group, geo: THREE.BufferGeometry, color: string, pos?: Point3, external?: boolean): THREE.Mesh;
  box(g: THREE.Group, size: Point3, pos: Point3, color?: string, external?: boolean): THREE.Mesh;
  cylinder(g: THREE.Group, r: number, h: number, pos: Point3, color?: string, rt?: number, external?: boolean): THREE.Mesh;
  sphere(g: THREE.Group, r: number, pos: Point3, color?: string, external?: boolean): THREE.Mesh;
  rod(g: THREE.Group, a: THREE.Vector3, b: THREE.Vector3, r?: number, color?: string): THREE.Mesh;
  ring(g: THREE.Group, r: number, y: number, color?: string): THREE.Mesh;
  electronics(g: THREE.Group, y?: number, count?: number, r?: number): void;
  engine(g: THREE.Group, r: number, y: number, x?: number, z?: number): void;
  solar(g: THREE.Group, x: number, y: number, w: number, h: number, axis?: string): THREE.Mesh;
  antenna(g: THREE.Group, y: number, r?: number, x?: number): void;
  detailRod(g: THREE.Group, a: Point3, b: Point3, r?: number, color?: string, external?: boolean): THREE.Mesh;
  face(g: THREE.Group, points: Point3[], color: string, external?: boolean): THREE.Mesh;
  loft(g: THREE.Group, rings: Point3[][], color: string, external?: boolean): THREE.Mesh;
}

export interface ModelResearch {
  id: string;
  configuration: string;
  reviewedOn: string;
  changes: string[];
  features: { title: string; detail: string; partId: string; sourceUrl: string }[];
  uncertainties: string[];
  sources: { title: string; url: string }[];
}
