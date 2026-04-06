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

  {
    id: 'p7',
    title: 'Problem 7',
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

    image: '/images/structure7.png',
    imageNoSupports: '/images/structure7_nosupports.png',
    solutionJson: '/solutions/structure7.json',

    // Exploded stage assets
    explodedImage: '/images/structure7_exploded.png',
    explodedSolutionJson: '/solutions/structure7_exploded.json',
  }, 

  {
    id: 'p8',
    title: 'Problem 8',
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

    image: '/images/structure8.png',
    imageNoSupports: '/images/structure8_nosupports.png',
    solutionJson: '/solutions/structure8.json',

    // Exploded stage assets
    explodedImage: '/images/structure8_exploded.png',
    explodedSolutionJson: '/solutions/structure8_exploded.json',
  }, 

 {
   id: 'p9',
   title: 'Problem 9',

    // (Optional) legacy single-field description (kept as fallback/reference)
   description:
     'Identify all external forces acting on the supported structure shown. Replace each support with the correct reaction forces and/or moments. Any friction forces should act on the lower boundary of the box and any other members this layer interacts with.',

     //New: per-screen subtitles (edit these placeholders)
    descriptions: {
      start:
       'Observe the supported structure and click to go to the next page when you are ready to solve it.',
     supports:
       'Add the appropriate forces acting on the unsupported structure. Any FRICTION forces should be placed on point A, while NORMAL forces should be on point B.', 
     exploded:
       '',
   },

    image: '/images/structure9_full.png',
    imageNoSupports: '/images/structure9_nosupports_full.png',
    solutionJson: '/solutions/structure9_full.json', 
  }, 

  {
    id: 'p10',
    title: 'Problem 10',

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

    image: '/images/structure10.png',
    imageNoSupports: '/images/structure10_nosupports.png',
    solutionJson: '/solutions/structure10.json',
  } 
];

export default problems;



