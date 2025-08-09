const scenarios = [
  // Triangle
  {
    polygon: [
      [100, 100],
      [200, 100],
      [150, 50],
    ],
    points: [
      { coord: [122, 64], isInPolygon: false },
      { coord: [150, 80], isInPolygon: true },
      { coord: [124, 113], isInPolygon: false },
      { coord: [176, 97], isInPolygon: true },
    ],
  },
  // Square
  {
    polygon: [
      [250, 100],
      [350, 100],
      [350, 200],
      [250, 200],
    ],
    points: [
      { coord: [292, 88], isInPolygon: false },
      { coord: [295, 145], isInPolygon: true },
      { coord: [234, 148], isInPolygon: false },
      { coord: [284, 221], isInPolygon: false },
      { coord: [333, 189], isInPolygon: true },
    ],
  },
  // Pentagon
  {
    polygon: [
      [100, 250],
      [150, 220],
      [180, 270],
      [150, 320],
      [100, 320],
    ],
    points: [
      { coord: [121, 225], isInPolygon: false },
      { coord: [159, 313], isInPolygon: false },
      { coord: [179, 255], isInPolygon: false },
      { coord: [108, 253], isInPolygon: true },
      { coord: [134, 307], isInPolygon: true },
    ],
  },
  // Hexagon
  {
    polygon: [
      [300, 250],
      [340, 270],
      [340, 330],
      [300, 350],
      [260, 330],
      [260, 270],
    ],
    points: [
      { coord: [275, 252], isInPolygon: false },
      { coord: [257, 305], isInPolygon: false },
      { coord: [279, 352], isInPolygon: false },
      { coord: [334, 346], isInPolygon: false },
      { coord: [339, 323], isInPolygon: true },
      { coord: [300, 293], isInPolygon: true },
    ],
  },
  // Arrow
  {
    polygon: [
      [450, 250],
      [500, 250],
      [500, 280],
      [550, 280],
      [475, 350],
      [400, 280],
      [450, 280],
    ],
    points: [
      { coord: [453, 345], isInPolygon: false },
      { coord: [506, 344], isInPolygon: false },
      { coord: [440, 270], isInPolygon: false },
      { coord: [482, 242], isInPolygon: false },
      { coord: [531, 270], isInPolygon: false },
      { coord: [425, 292], isInPolygon: true },
      { coord: [493, 268], isInPolygon: true },
    ],
  },
  // L-polygon
  {
    polygon: [
      [100, 400],
      [200, 400],
      [200, 450],
      [150, 450],
      [150, 500],
      [100, 500],
    ],
    points: [
      { coord: [150, 392], isInPolygon: false },
      { coord: [90, 429], isInPolygon: false },
      { coord: [157, 433], isInPolygon: true },
      { coord: [137, 490], isInPolygon: true },
      { coord: [124, 427], isInPolygon: true },
      { coord: [191, 488], isInPolygon: false },
    ],
  },
  // Star
  {
    polygon: [
      [350, 400],
      [365, 435],
      [400, 435],
      [375, 460],
      [385, 495],
      [350, 475],
      [315, 495],
      [325, 460],
      [300, 435],
      [335, 435],
    ],
    points: [
      { coord: [327, 394], isInPolygon: false },
      { coord: [330, 428], isInPolygon: false },
      { coord: [326, 447], isInPolygon: true },
      { coord: [352, 455], isInPolygon: true },
      { coord: [373, 480], isInPolygon: true },
      { coord: [405, 460], isInPolygon: false },
      { coord: [414, 419], isInPolygon: false },
    ],
  },
  // Hourglass
  {
    polygon: [
      [510, 60],
      [530, 40],
      [600, 80],
      [630, 120],
      [700, 160],
      [720, 140],
      [720, 60],
      [700, 40],
      [630, 80],
      [600, 120],
      [530, 160],
      [510, 140],
    ],
    points: [
      { coord: [502, 98], isInPolygon: false },
      { coord: [592, 63], isInPolygon: false },
      { coord: [616, 116], isInPolygon: false },
      { coord: [723, 156], isInPolygon: false },
      { coord: [534, 55], isInPolygon: true },
      { coord: [603, 97], isInPolygon: true },
      { coord: [659, 79], isInPolygon: true },
      { coord: [701, 148], isInPolygon: true },
    ],
  },
  // Zigzag
  {
    polygon: [
      [650, 270],
      [590, 320],
      [735, 340],
      [570, 415],
      [780, 425],
      [720, 435],
      [760, 440],
      [605, 505],
      [735, 525],
    ],
    points: [
      { coord: [616, 286], isInPolygon: false },
      { coord: [689, 321], isInPolygon: false },
      { coord: [667, 365], isInPolygon: false },
      { coord: [756, 436], isInPolygon: false },
      { coord: [701, 453], isInPolygon: false },
      { coord: [722, 514], isInPolygon: true },
      { coord: [643, 504], isInPolygon: true },
      { coord: [728, 429], isInPolygon: true },
      { coord: [723, 450], isInPolygon: true },
      { coord: [690, 355], isInPolygon: true },
    ],
  },
  // Fuzzy Star
  {
    polygon: [
      [495, 450],
      [565, 560],
      [450, 525],
      [560, 465],
      [500, 580],
      [470, 475],
      [570, 515],
      [460, 570],
    ],
    points: [
      { coord: [526, 476], isInPolygon: false },
      { coord: [482, 471], isInPolygon: false },
      { coord: [467, 503], isInPolygon: false },
      { coord: [525, 563], isInPolygon: false },
      { coord: [412, 582], isInPolygon: false },
      { coord: [553, 500], isInPolygon: false },
      { coord: [541, 514], isInPolygon: true },
      { coord: [498, 482], isInPolygon: true },
      { coord: [508, 522], isInPolygon: true },
      { coord: [518, 545], isInPolygon: false },
      { coord: [519, 492], isInPolygon: false },
      { coord: [493, 494], isInPolygon: false },
      { coord: [479, 547], isInPolygon: true },
      { coord: [557, 554], isInPolygon: true },
    ],
  },
]

/* eslint-disable no-undef */
module.exports = { scenarios }
/* eslint-enable no-undef */
