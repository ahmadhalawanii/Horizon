import SwiftUI

/// Preview the scanned layout and upload to Horizon.
struct ReviewView: View {
    let layout: HomeLayout
    @Binding var uploadStatus: ScanView.UploadStatus
    let onUpload: () -> Void
    let onRescan: () -> Void

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Mini floor plan preview
                FloorPlanPreview(rooms: layout.rooms)
                    .frame(height: 250)
                    .background(Color.gray.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 16))

                // Room list
                VStack(alignment: .leading, spacing: 12) {
                    Text("Scanned Rooms (\(layout.rooms.count))")
                        .font(.headline)
                        .foregroundStyle(.white)

                    ForEach(layout.rooms) { room in
                        HStack {
                            Image(systemName: "rectangle.split.3x1")
                                .foregroundStyle(.cyan)
                            VStack(alignment: .leading) {
                                Text(room.name)
                                    .font(.subheadline.bold())
                                    .foregroundStyle(.white)
                                Text("\(room.furniture.count) items · \(String(format: "%.1f", room.heightM))m height")
                                    .font(.caption)
                                    .foregroundStyle(.gray)
                            }
                            Spacer()
                        }
                        .padding(12)
                        .background(Color.gray.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                }
                .padding(.horizontal)

                // Upload section
                VStack(spacing: 12) {
                    switch uploadStatus {
                    case .idle:
                        Button(action: onUpload) {
                            Label("Send to Horizon", systemImage: "arrow.up.circle.fill")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.cyan)
                                .foregroundStyle(.black)
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                    case .uploading:
                        ProgressView("Uploading layout...")
                            .padding()
                    case .success(let result):
                        VStack(spacing: 8) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.largeTitle)
                                .foregroundStyle(.green)
                            Text("Layout uploaded!")
                                .font(.headline).foregroundStyle(.green)
                            Text("\(result.roomsCreated) rooms created, \(result.roomsUpdated) updated")
                                .font(.caption).foregroundStyle(.gray)
                        }
                        .padding()
                    case .failed(let error):
                        VStack(spacing: 8) {
                            Image(systemName: "xmark.circle.fill")
                                .font(.largeTitle)
                                .foregroundStyle(.red)
                            Text("Upload failed")
                                .font(.headline).foregroundStyle(.red)
                            Text(error)
                                .font(.caption).foregroundStyle(.gray)
                            Button("Retry", action: onUpload)
                                .buttonStyle(.bordered)
                        }
                        .padding()
                    }

                    Button(action: onRescan) {
                        Label("Scan Again", systemImage: "arrow.counterclockwise")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.gray.opacity(0.15))
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                }
                .padding(.horizontal)
            }
            .padding(.vertical)
        }
    }
}

/// Simple 2D top-down floor plan preview.
struct FloorPlanPreview: View {
    let rooms: [RoomLayout]

    var body: some View {
        GeometryReader { geo in
            let bounds = computeBounds()
            let scale = min(
                (geo.size.width - 40) / max(bounds.width, 1),
                (geo.size.height - 40) / max(bounds.height, 1)
            )
            let offsetX = (geo.size.width - bounds.width * scale) / 2
            let offsetY = (geo.size.height - bounds.height * scale) / 2

            ZStack {
                ForEach(rooms) { room in
                    Path { path in
                        guard let first = room.polygon.first else { return }
                        path.move(to: CGPoint(
                            x: (first[0] - bounds.minX) * scale + offsetX,
                            y: (first[1] - bounds.minY) * scale + offsetY
                        ))
                        for point in room.polygon.dropFirst() {
                            path.addLine(to: CGPoint(
                                x: (point[0] - bounds.minX) * scale + offsetX,
                                y: (point[1] - bounds.minY) * scale + offsetY
                            ))
                        }
                        path.closeSubpath()
                    }
                    .fill(Color.cyan.opacity(0.15))
                    .overlay(
                        Path { path in
                            guard let first = room.polygon.first else { return }
                            path.move(to: CGPoint(
                                x: (first[0] - bounds.minX) * scale + offsetX,
                                y: (first[1] - bounds.minY) * scale + offsetY
                            ))
                            for point in room.polygon.dropFirst() {
                                path.addLine(to: CGPoint(
                                    x: (point[0] - bounds.minX) * scale + offsetX,
                                    y: (point[1] - bounds.minY) * scale + offsetY
                                ))
                            }
                            path.closeSubpath()
                        }
                        .stroke(Color.cyan, lineWidth: 2)
                    )

                    // Room label
                    let center = roomCenter(room)
                    Text(room.name)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(.white)
                        .position(
                            x: (center.x - bounds.minX) * scale + offsetX,
                            y: (center.y - bounds.minY) * scale + offsetY
                        )
                }
            }
        }
    }

    private func computeBounds() -> (minX: Double, minY: Double, width: Double, height: Double) {
        var minX = Double.infinity, minY = Double.infinity
        var maxX = -Double.infinity, maxY = -Double.infinity
        for room in rooms {
            for pt in room.polygon {
                minX = min(minX, pt[0]); minY = min(minY, pt[1])
                maxX = max(maxX, pt[0]); maxY = max(maxY, pt[1])
            }
        }
        return (minX, minY, maxX - minX, maxY - minY)
    }

    private func roomCenter(_ room: RoomLayout) -> CGPoint {
        let xs = room.polygon.map { $0[0] }
        let ys = room.polygon.map { $0[1] }
        return CGPoint(x: xs.reduce(0, +) / Double(xs.count),
                       y: ys.reduce(0, +) / Double(ys.count))
    }
}
