import { copy } from "./portfolio";

export const journey = [
  {
    id: "home",
    sky: "VIRGO",
    color: "#cdb38b",
    label: copy("Khởi hành", "Departure"),
    title: copy(
      "Một chút tò mò. Một vũ trụ mở.",
      "A little curiosity. An open universe.",
    ),
    description: copy(
      "Bắt đầu từ một ngôi sao, đi theo những điều mình đã xây dựng.",
      "Start with a star. Follow the things I have built.",
    ),
    points: [
      [12, 25],
      [30, 38],
      [48, 32],
      [72, 18],
      [85, 42],
      [65, 64],
      [43, 83],
      [30, 38],
    ],
  },
  {
    id: "story",
    sky: "LYRA",
    color: "#ecc293",
    label: copy("Câu chuyện", "My story"),
    title: copy("Những câu hỏi dẫn đường.", "Led by questions."),
    description: copy(
      "Một người đang học cách nối sự tò mò với những điều có ích.",
      "Learning to connect curiosity with something useful.",
    ),
    points: [
      [26, 14],
      [40, 38],
      [73, 28],
      [82, 69],
      [49, 81],
      [40, 38],
    ],
  },
  {
    id: "projects",
    sky: "ORION",
    color: "#90cfff",
    label: copy("Dự án", "Selected work"),
    title: copy("Những ý tưởng đã thành hình.", "Where ideas take shape."),
    description: copy(
      "Mười dự án. Những bài toán khác nhau. Từng quyết định đều có một câu chuyện phía sau.",
      "Ten projects. Different problems. A story behind each decision.",
    ),
    points: [
      [18, 15],
      [45, 25],
      [78, 12],
      [62, 47],
      [51, 51],
      [40, 55],
      [25, 84],
      [72, 86],
      [62, 47],
    ],
  },
  {
    id: "skills",
    sky: "CYGNUS",
    color: "#95e1c5",
    label: copy("Năng lực", "Capabilities"),
    title: copy("Khi các điểm sáng kết nối.", "When the dots connect."),
    description: copy(
      "Từ giao diện đến dữ liệu, từ một thiết bị đến cả hệ thống. Kỹ năng được kể bằng công việc thực tế.",
      "From interfaces to data, from one device to a system. Skills told through actual work.",
    ),
    points: [
      [48, 12],
      [48, 43],
      [16, 60],
      [48, 43],
      [84, 27],
      [48, 43],
      [56, 86],
    ],
  },
  {
    id: "contact",
    sky: "CASSIOPEIA",
    color: "#e9abb8",
    label: copy("Kết nối", "Contact"),
    title: copy("Quỹ đạo tiếp theo, cùng nhau.", "The next orbit, together."),
    description: copy(
      "Một cuộc trò chuyện có thể là điểm bắt đầu cho những điều mình chưa hình dung tới.",
      "One conversation could start something I have yet to imagine.",
    ),
    points: [
      [12, 30],
      [31, 73],
      [49, 30],
      [69, 67],
      [88, 18],
    ],
  },
] as const;

export type Chapter = (typeof journey)[number];
export function chapterForHash(hash: string): Chapter | undefined {
  const id = hash.replace(/^#\//, "").split("/")[0] || "home";
  return journey.find((chapter) => chapter.id === id);
}

// Shared by the drawing and its progress marks: every light lands on a real vertex.
export function flightGeometry(points: readonly (readonly number[])[]) {
  const distances = points.map((point, i) =>
    i === 0
      ? 0
      : Math.hypot(point[0] - points[i - 1][0], point[1] - points[i - 1][1]),
  );
  const total = distances.reduce((a, b) => a + b, 0);
  let walked = 0;
  return {
    path: points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" "),
    stops: distances.map((distance) => (walked += distance) / (total || 1)),
  };
}

export const signalSequence = (fragment: number) =>
  [2, 0, 3, 1].map((n) => (n + fragment) % 4);
export function advanceSignal(step: number, star: number, fragment: number) {
  return star === signalSequence(fragment)[step] ? step + 1 : 0;
}
