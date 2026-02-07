# Horizon iOS LiDAR Scanner

## Overview

The Horizon Scanner is a companion iOS app that uses Apple's RoomPlan API with LiDAR to scan your home layout. The scan is converted into a simplified floor plan JSON and sent to the Horizon backend, where it powers the 3D digital twin view.

## Prerequisites

- **iPhone 12 Pro or later** (LiDAR-enabled device)
- iOS 16.0+
- Xcode 15+ (for building from source)
- Horizon backend running and accessible from the iPhone

## Building the iOS App

```bash
cd mobile/ios/HorizonScanner
open HorizonScanner.xcodeproj
```

1. Open the project in Xcode
2. Select your development team under Signing & Capabilities
3. Select your connected iPhone as the build target
4. Build and run (Cmd+R)

> **Note**: RoomPlan requires a physical LiDAR-enabled device. The Simulator does not support LiDAR scanning, but the app includes a "Use Sample Scan" button for demo purposes.

## Usage Flow

### 1. Configure Connection
- Open the **Settings** tab in the app
- Set **API Base URL** to your backend (e.g., `http://192.168.1.100:8000`)
- Set **Auth Token** (default: `horizon-demo-token`)

### 2. Scan a Room
- Go to the **Scan** tab
- Tap **Start Scan** (or **Use Sample Scan** for demo)
- Walk slowly around the room, pointing the camera at walls and furniture
- The RoomPlan API will detect walls, doors, and furniture in real-time
- Tap **Done** when finished

### 3. Review & Upload
- Review the scanned rooms in the preview
- Check room names and dimensions
- Tap **Send to Horizon** to upload the layout
- The web frontend will automatically show the 3D view

## Demo Mode (No LiDAR)

If running on a device without LiDAR or in the Simulator:
- Tap **Use Sample Scan** on the main screen
- This loads a pre-built Villa A layout (4 rooms with furniture)
- Upload works the same way

## Layout JSON Format

The app sends this structure to `POST /layout/import`:

```json
{
  "home_name": "Villa A",
  "rooms": [
    {
      "id": "living_room_1",
      "name": "Living Room",
      "polygon": [[0,0], [6,0], [6,5], [0,5]],
      "height_m": 2.8,
      "furniture": [
        {"type": "sofa", "center": [3, 4], "size": [2.4, 1.0]}
      ]
    }
  ]
}
```

## How the 3D View Uses the Layout

1. Each room's `polygon` becomes a floor mesh and extruded walls in Three.js
2. `furniture` items are rendered as semi-transparent boxes
3. Devices from the Horizon data model are placed as colored markers in their rooms
4. Clicking a room in the 3D view selects it in the Console page

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "LiDAR not available" | Use a LiDAR-enabled iPhone (12 Pro+) or tap "Use Sample Scan" |
| Upload fails | Check API URL in Settings; ensure backend is running |
| NSAppTransportSecurity error | Info.plist allows arbitrary loads for local development |
| Camera permission denied | Go to Settings > Horizon Scanner > Camera > Allow |
