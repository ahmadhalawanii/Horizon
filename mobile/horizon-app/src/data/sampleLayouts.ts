/**
 * Predefined apartment layouts for the "Use sample layout" flow.
 * Designed to match the backend's LayoutImportIn schema.
 */

export interface SampleLayout {
  id: string;
  label: string;
  description: string;
  data: {
    home_name: string;
    rooms: {
      id: string;
      name: string;
      polygon: number[][];
      height_m: number;
      furniture: { type: string; center: number[]; size: number[] }[];
    }[];
  };
}

export const SAMPLE_LAYOUTS: SampleLayout[] = [
  {
    id: "studio",
    label: "Studio",
    description: "Open-plan studio with kitchenette",
    data: {
      home_name: "Studio",
      rooms: [
        {
          id: "main_1",
          name: "Living Area",
          polygon: [[0, 0], [6, 0], [6, 5], [0, 5]],
          height_m: 2.7,
          furniture: [
            { type: "bed", center: [1.5, 1.5], size: [2.0, 1.4] },
            { type: "sofa", center: [4.5, 4], size: [2.0, 0.8] },
          ],
        },
        {
          id: "kitchen_1",
          name: "Kitchen",
          polygon: [[6.2, 0], [9, 0], [9, 3], [6.2, 3]],
          height_m: 2.7,
          furniture: [
            { type: "counter", center: [7.6, 0.4], size: [2.4, 0.6] },
          ],
        },
        {
          id: "bath_1",
          name: "Bathroom",
          polygon: [[6.2, 3.2], [9, 3.2], [9, 5], [6.2, 5]],
          height_m: 2.7,
          furniture: [],
        },
      ],
    },
  },
  {
    id: "1br",
    label: "1 Bedroom",
    description: "One-bedroom apartment",
    data: {
      home_name: "1BR Apartment",
      rooms: [
        {
          id: "living_1",
          name: "Living Room",
          polygon: [[0, 0], [5, 0], [5, 4], [0, 4]],
          height_m: 2.8,
          furniture: [
            { type: "sofa", center: [2.5, 3], size: [2.4, 0.8] },
            { type: "tv_unit", center: [2.5, 0.4], size: [1.6, 0.4] },
          ],
        },
        {
          id: "bedroom_1",
          name: "Bedroom",
          polygon: [[5.2, 0], [9, 0], [9, 4], [5.2, 4]],
          height_m: 2.8,
          furniture: [
            { type: "bed", center: [7.1, 2], size: [2.0, 1.6] },
          ],
        },
        {
          id: "kitchen_1",
          name: "Kitchen",
          polygon: [[0, 4.2], [4, 4.2], [4, 6.5], [0, 6.5]],
          height_m: 2.8,
          furniture: [
            { type: "counter", center: [2, 4.6], size: [3.5, 0.6] },
          ],
        },
        {
          id: "bath_1",
          name: "Bathroom",
          polygon: [[4.2, 4.2], [6.5, 4.2], [6.5, 6.5], [4.2, 6.5]],
          height_m: 2.8,
          furniture: [],
        },
      ],
    },
  },
  {
    id: "villa",
    label: "Villa A",
    description: "UAE-style villa with garage",
    data: {
      home_name: "Villa A",
      rooms: [
        {
          id: "living_room_1",
          name: "Living Room",
          polygon: [[0, 0], [6, 0], [6, 5], [0, 5]],
          height_m: 2.8,
          furniture: [
            { type: "sofa", center: [3, 4], size: [2.4, 1.0] },
            { type: "tv_unit", center: [3, 0.4], size: [1.8, 0.5] },
          ],
        },
        {
          id: "bedroom_1",
          name: "Bedroom",
          polygon: [[6.2, 0], [10.2, 0], [10.2, 4], [6.2, 4]],
          height_m: 2.8,
          furniture: [
            { type: "bed", center: [8.2, 2], size: [2.0, 1.6] },
          ],
        },
        {
          id: "kitchen_1",
          name: "Kitchen",
          polygon: [[0, 5.2], [4, 5.2], [4, 8.2], [0, 8.2]],
          height_m: 2.8,
          furniture: [
            { type: "counter", center: [2, 5.6], size: [3.5, 0.6] },
          ],
        },
        {
          id: "garage_1",
          name: "Garage",
          polygon: [[4.2, 5.2], [10.2, 5.2], [10.2, 8.2], [4.2, 8.2]],
          height_m: 3.0,
          furniture: [
            { type: "car_space", center: [7.2, 6.7], size: [4.5, 2.2] },
          ],
        },
      ],
    },
  },
];
