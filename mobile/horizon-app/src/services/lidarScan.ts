/**
 * LiDAR / RoomPlan scan stub.
 *
 * In production on a LiDAR-enabled iPhone, this would:
 *   1) Use expo-dev-client + a native config plugin wrapping ARKit RoomPlan
 *   2) Parse the CapturedRoom result into our LayoutHome JSON format
 *   3) Return the rooms array with polygon + furniture data
 *
 * For the hackathon demo, this returns a sample layout that mimics
 * what a real RoomPlan scan would produce.
 */

import { SAMPLE_LAYOUTS } from "../data/sampleLayouts";

export interface ScanResult {
  success: boolean;
  layout: {
    home_name: string;
    rooms: {
      id: string;
      name: string;
      polygon: number[][];
      height_m: number;
      furniture: { type: string; center: number[]; size: number[] }[];
    }[];
  } | null;
  method: "lidar" | "sample";
  error?: string;
}

/**
 * Attempt a LiDAR scan. Falls back to sample data.
 *
 * In a real implementation with expo-dev-client + ARKit config plugin:
 *   - Check if RoomPlan is available (iOS 16+, LiDAR hardware)
 *   - Start a RoomCaptureSession
 *   - Convert CapturedRoom polygons → our JSON format
 *   - Return the result
 */
export async function performLidarScan(): Promise<ScanResult> {
  // Check if native LiDAR module is available
  // (It won't be in Expo Go — only in custom dev clients)
  const hasLidar = await checkLidarAvailability();

  if (hasLidar) {
    try {
      const layout = await nativeLidarScan();
      return { success: true, layout, method: "lidar" };
    } catch (err: any) {
      return {
        success: false,
        layout: null,
        method: "lidar",
        error: err.message || "LiDAR scan failed",
      };
    }
  }

  // Not available — inform user
  return {
    success: false,
    layout: null,
    method: "lidar",
    error: "LiDAR not available. Use a sample layout or a LiDAR-enabled iPhone with a custom dev client.",
  };
}

/**
 * Get a sample layout for demo purposes.
 */
export function getSampleLayout(layoutId: string = "villa"): ScanResult {
  const sample = SAMPLE_LAYOUTS.find((l) => l.id === layoutId);
  if (!sample) {
    return { success: false, layout: null, method: "sample", error: "Layout not found" };
  }
  return { success: true, layout: sample.data, method: "sample" };
}

// ─── Native LiDAR stubs ─────────────────────────────────

async function checkLidarAvailability(): Promise<boolean> {
  // In a real implementation:
  //   import { NativeModules, Platform } from 'react-native';
  //   if (Platform.OS !== 'ios') return false;
  //   return NativeModules.HorizonRoomPlan?.isAvailable() ?? false;
  return false;
}

async function nativeLidarScan(): Promise<ScanResult["layout"]> {
  // Stub: would call NativeModules.HorizonRoomPlan.startScan()
  // and convert the CapturedRoom result to our format:
  //
  //   const captured = await NativeModules.HorizonRoomPlan.startScan();
  //   return {
  //     home_name: "Scanned Home",
  //     rooms: captured.rooms.map(room => ({
  //       id: room.identifier,
  //       name: room.label || `Room ${room.identifier}`,
  //       polygon: room.floorPolygon.map(p => [p.x, p.z]),
  //       height_m: room.height,
  //       furniture: room.objects.map(obj => ({
  //         type: obj.category,
  //         center: [obj.position.x, obj.position.z],
  //         size: [obj.dimensions.x, obj.dimensions.z],
  //       })),
  //     })),
  //   };
  //
  throw new Error("Native LiDAR module not linked");
}
