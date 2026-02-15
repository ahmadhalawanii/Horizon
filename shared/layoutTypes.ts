/**
 * Shared layout types used by both web frontend and Expo mobile app.
 * Matches the backend's LayoutImportIn / LayoutStateOut schemas.
 */

export interface FurnitureItem {
  type: string;
  center: [number, number];
  size: [number, number];
}

export interface LayoutRoom {
  id: string;
  name: string;
  polygon: [number, number][];
  height_m: number;
  furniture: FurnitureItem[];
}

export interface LayoutHome {
  home_name: string;
  rooms: LayoutRoom[];
}

export interface RoomGeometry {
  room_id: number;
  room_name: string;
  polygon: number[][];
  height_m: number;
  furniture: { type: string; center: number[]; size: number[] }[];
  devices: {
    device_id: number;
    type: string;
    name: string;
    status: string;
    power_kw: number;
  }[];
}

export interface LayoutState {
  home_id: number;
  home_name: string;
  rooms: RoomGeometry[];
}
