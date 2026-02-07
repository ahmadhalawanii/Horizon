import SwiftUI
import RoomPlan

/// Checks RoomPlan availability at runtime.
struct RoomPlanSupport {
    static var isAvailable: Bool {
        if #available(iOS 16.0, *) {
            return RoomCaptureSession.isSupported
        }
        return false
    }
}

/// Wraps Apple's RoomCaptureView for the scanning experience.
@available(iOS 16.0, *)
struct RoomPlanScanView: UIViewControllerRepresentable {
    let onComplete: (HomeLayout) -> Void

    func makeUIViewController(context: Context) -> RoomPlanScanController {
        let controller = RoomPlanScanController()
        controller.onComplete = onComplete
        return controller
    }

    func updateUIViewController(_ uiViewController: RoomPlanScanController, context: Context) {}
}

@available(iOS 16.0, *)
class RoomPlanScanController: UIViewController, RoomCaptureViewDelegate, RoomCaptureSessionDelegate {
    var onComplete: ((HomeLayout) -> Void)?
    private var roomCaptureView: RoomCaptureView!
    private var captureSession: RoomCaptureSession!
    private var finalResult: CapturedRoom?

    override func viewDidLoad() {
        super.viewDidLoad()

        roomCaptureView = RoomCaptureView(frame: view.bounds)
        roomCaptureView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        roomCaptureView.delegate = self
        view.addSubview(roomCaptureView)

        captureSession = roomCaptureView.captureSession
        captureSession.delegate = self

        // Done button
        let doneButton = UIButton(type: .system)
        doneButton.setTitle("Done", for: .normal)
        doneButton.titleLabel?.font = .boldSystemFont(ofSize: 18)
        doneButton.setTitleColor(.white, for: .normal)
        doneButton.backgroundColor = UIColor(red: 0.024, green: 0.714, blue: 0.831, alpha: 1)
        doneButton.layer.cornerRadius = 12
        doneButton.translatesAutoresizingMaskIntoConstraints = false
        doneButton.addTarget(self, action: #selector(doneTapped), for: .touchUpInside)
        view.addSubview(doneButton)
        NSLayoutConstraint.activate([
            doneButton.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -20),
            doneButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            doneButton.widthAnchor.constraint(equalToConstant: 150),
            doneButton.heightAnchor.constraint(equalToConstant: 50),
        ])
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        let config = RoomCaptureSession.Configuration()
        captureSession.run(configuration: config)
    }

    @objc private func doneTapped() {
        captureSession.stop()
    }

    // MARK: - RoomCaptureSessionDelegate

    func captureSession(_ session: RoomCaptureSession, didEndWith data: CapturedRoomData, error: Error?) {
        if let error = error {
            print("RoomPlan error: \(error)")
        }

        // Process the captured room on a background queue
        Task {
            do {
                let finalRoom = try data.finalResult
                let layout = Self.convertToLayout(finalRoom)
                await MainActor.run {
                    onComplete?(layout)
                    dismiss(animated: true)
                }
            } catch {
                print("Failed to process room: \(error)")
                await MainActor.run { dismiss(animated: true) }
            }
        }
    }

    func captureView(_ view: RoomCaptureView, didPresent processedResult: CapturedRoom, error: Error?) {
        finalResult = processedResult
    }

    // MARK: - Conversion

    /// Convert RoomPlan's CapturedRoom into our simplified HomeLayout JSON.
    static func convertToLayout(_ room: CapturedRoom) -> HomeLayout {
        var roomLayouts: [RoomLayout] = []

        // Extract walls to build room polygon
        let wallPoints: [[Double]] = room.walls.map { wall in
            let pos = wall.transform.columns.3
            return [Double(pos.x), Double(pos.z)]
        }

        // Build a convex hull-ish polygon from wall positions
        let polygon = wallPoints.isEmpty
            ? [[0.0, 0.0], [5.0, 0.0], [5.0, 4.0], [0.0, 4.0]]
            : buildSimplePolygon(from: wallPoints)

        // Extract furniture
        var furniture: [FurnitureItem] = []
        for obj in room.objects {
            let pos = obj.transform.columns.3
            let dims = obj.dimensions
            furniture.append(FurnitureItem(
                type: obj.category.description,
                center: [Double(pos.x), Double(pos.z)],
                size: [Double(dims.x), Double(dims.z)]
            ))
        }

        // Estimate height from walls
        let heights = room.walls.map { Double($0.dimensions.y) }
        let avgHeight = heights.isEmpty ? 2.8 : heights.reduce(0, +) / Double(heights.count)

        roomLayouts.append(RoomLayout(
            id: "scanned_room_\(UUID().uuidString.prefix(8))",
            name: "Scanned Room",
            polygon: polygon,
            heightM: avgHeight,
            furniture: furniture
        ))

        return HomeLayout(homeName: "My Home", rooms: roomLayouts)
    }

    /// Build a simple polygon outline from scattered wall positions.
    private static func buildSimplePolygon(from points: [[Double]]) -> [[Double]] {
        guard points.count >= 3 else { return points }

        // Simple convex hull using Gift Wrapping
        var hull: [[Double]] = []
        var leftmost = points[0]
        for p in points { if p[0] < leftmost[0] { leftmost = p } }

        var current = leftmost
        repeat {
            hull.append(current)
            var next = points[0]
            for candidate in points {
                if next == current || crossProduct(current, next, candidate) > 0 {
                    next = candidate
                }
            }
            current = next
        } while current != leftmost && hull.count < points.count + 1

        return hull
    }

    private static func crossProduct(_ o: [Double], _ a: [Double], _ b: [Double]) -> Double {
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    }
}

// Helper for category description
@available(iOS 16.0, *)
extension CapturedRoom.Object.Category {
    var description: String {
        switch self {
        case .storage: return "storage"
        case .bed: return "bed"
        case .table: return "table"
        case .chair: return "chair"
        case .sofa: return "sofa"
        case .television: return "tv"
        case .bathtub: return "bathtub"
        case .sink: return "sink"
        case .toilet: return "toilet"
        case .stove: return "stove"
        case .refrigerator: return "fridge"
        case .washerDryer: return "washer_dryer"
        case .dishwasher: return "dishwasher"
        case .fireplace: return "fireplace"
        @unknown default: return "furniture"
        }
    }
}
