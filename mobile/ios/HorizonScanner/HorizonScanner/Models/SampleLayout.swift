import Foundation

/// Bundled sample layout for demo mode (no LiDAR required).
struct SampleLayout {
    static let villaA = HomeLayout(
        homeName: "Villa A",
        rooms: [
            RoomLayout(
                id: "living_room_1",
                name: "Living Room",
                polygon: [[0,0],[6,0],[6,5],[0,5]],
                heightM: 2.8,
                furniture: [
                    FurnitureItem(type: "sofa", center: [3, 4], size: [2.4, 1.0]),
                    FurnitureItem(type: "tv_unit", center: [3, 0.4], size: [1.8, 0.5]),
                    FurnitureItem(type: "coffee_table", center: [3, 2.5], size: [1.2, 0.6])
                ]
            ),
            RoomLayout(
                id: "bedroom_1",
                name: "Bedroom",
                polygon: [[6.2,0],[10.2,0],[10.2,4],[6.2,4]],
                heightM: 2.8,
                furniture: [
                    FurnitureItem(type: "bed", center: [8.2, 2], size: [2.0, 1.6]),
                    FurnitureItem(type: "wardrobe", center: [6.6, 2], size: [0.6, 2.0]),
                    FurnitureItem(type: "nightstand", center: [9.8, 0.8], size: [0.5, 0.4])
                ]
            ),
            RoomLayout(
                id: "kitchen_1",
                name: "Kitchen",
                polygon: [[0,5.2],[4,5.2],[4,8.2],[0,8.2]],
                heightM: 2.8,
                furniture: [
                    FurnitureItem(type: "counter", center: [2, 5.6], size: [3.5, 0.6]),
                    FurnitureItem(type: "dining_table", center: [2, 7.2], size: [1.5, 1.0]),
                    FurnitureItem(type: "fridge", center: [0.4, 6.5], size: [0.7, 0.7])
                ]
            ),
            RoomLayout(
                id: "garage_1",
                name: "Garage",
                polygon: [[4.2,5.2],[10.2,5.2],[10.2,8.2],[4.2,8.2]],
                heightM: 3.0,
                furniture: [
                    FurnitureItem(type: "car_space", center: [7.2, 6.7], size: [4.5, 2.2])
                ]
            )
        ]
    )
}
