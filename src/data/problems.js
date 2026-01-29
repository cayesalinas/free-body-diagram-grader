// src/data/problems.js
// Central place to list problems & their assets.
// You can extend each entry with per-problem configs later (supports, regions, etc.)

const problems = [
  {
    id: 'p1',
    title: 'Problem 1',

    // (Optional) legacy single-field description (kept as fallback/reference)
    description:
      'Identify all external forces acting on the supported structure shown. Replace each support with the correct reaction forces and/or moments.',

    // New: per-screen subtitles (edit these placeholders)
    descriptions: {
      start:
        'Observe the supported structure and click to go to the next page when you are ready to solve it.',
      supports:
        'Add the appropriate forces acting on the unsupported structure.',
      exploded:
        '',
    },

    image: '/images/structure1.png',
    imageNoSupports: '/images/structure1_nosupports.png',
    solutionJson: '/solutions/structure1.json',
  },

  {
    id: 'p2',
    title: 'Problem 2',
    description:
      'For the given massless frame, draw the free body diagram by removing the supports and adding the appropriate reactions. Proceed to the exploded view when prompted.',

    descriptions: {
      start:
        'Observe the frame and click to go to the next page when you are ready to solve it.',
      supports:
        'Add the appropriate forces acting on the unsupported structure. You may assume that this is a massless frame.',
      exploded:
        'Add internal action–reaction forces at the breakaway joints.',
    },

    image: '/images/structure2.png',
    imageNoSupports: '/images/structure2_nosupports.png',
    solutionJson: '/solutions/structure2.json',

    // Exploded stage assets
    explodedImage: '/images/structure2_exploded.png',
    explodedSolutionJson: '/solutions/structure2_exploded.json',
  },

  {
    id: 'p3',
    title: 'Problem 3',
    description:
      'Identify all external forces acting on the supported structure shown. Replace each support with the correct reaction forces and/or moments.',

    descriptions: {
      start:
        'Observe the frame and click to go to the next page when you are ready to solve it.',
      supports:
        'Add the appropriate forces acting on the unsupported structure. You may assume that this is a massless frame.',
      exploded:
        'Add internal action–reaction forces at the breakaway joints.',
    },

    image: '/images/structure3.png',
    imageNoSupports: '/images/structure3_nosupports.png',
    solutionJson: '/solutions/structure3.json',

    // Exploded stage assets
    explodedImage: '/images/structure3_exploded.png',
    explodedSolutionJson: '/solutions/structure3_exploded.json',
  },

  {
    id: 'p4',
    title: 'Problem 4',
    description:
      'Identify all external forces acting on the supported structure shown. Replace each support with the correct reaction forces and/or moments.',

    descriptions: {
      start:
        'Observe the supported structure and click to go to the next page when you are ready to solve it.',
      supports:
        'Add the appropriate forces acting on the unsupported structure.',
      exploded:
        '',
    },

    image: '/images/structure4.png',
    imageNoSupports: '/images/structure4_nosupports.png',
    solutionJson: '/solutions/structure4.json',
  },

  {
    id: 'p5',
    title: 'Problem 5',
    description:
      'Identify all external forces acting on the supported structure shown. Replace each support with the correct reaction forces and/or moments.',

    descriptions: {
      start:
        'Observe the supported structure and click to go to the next page when you are ready to solve it.',
      supports:
        'Add the appropriate forces acting on the unsupported structure.',
      exploded:
        '',
    },

    image: '/images/structure5.png',
    imageNoSupports: '/images/structure5_nosupports.png',
    solutionJson: '/solutions/structure5.json',
  },

  {
    id: 'p6',
    title: 'Problem 6',
    description:
      'Identify all external forces acting on the supported structure shown. Replace each support with the correct reaction forces and/or moments.',

    descriptions: {
      start:
        'Observe the supported structure and click to go to the next page when you are ready to solve it.',
      supports:
        'Add the appropriate forces acting on the unsupported structure.',
      exploded:
        '',
    },

    image: '/images/structure6.png',
    imageNoSupports: '/images/structure6_nosupports.png',
    solutionJson: '/solutions/structure6.json',
  },
];

export default problems;



