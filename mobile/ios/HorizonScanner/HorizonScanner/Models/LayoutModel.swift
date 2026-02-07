import Foundation

/// The JSON layout model sent to the Horizon backend.
struct HomeLayout: Codable {
    var homeName: String
    var rooms: [RoomLayout]

    enum CodingKeys: String, CodingKey {
        case homeName = "home_name"
        case rooms
    }
}

struct RoomLayout: Codable, Identifiable {
    var id: String
    var name: String
    var polygon: [[Double]]  // [[x,y], [x,y], ...]
    var heightM: Double
    var furniture: [FurnitureItem]

    enum CodingKeys: String, CodingKey {
        case id, name, polygon
        case heightM = "height_m"
        case furniture
    }
}

struct FurnitureItem: Codable {
    var type: String
    var center: [Double]  // [x, y]
    var size: [Double]    // [width, depth]
}
