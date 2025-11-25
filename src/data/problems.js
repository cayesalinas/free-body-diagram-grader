// src/data/problems.js
// Central place to list problems & their assets.
// You can extend each entry with per-problem configs later (supports, regions, etc.)

const problems = [
  {
    id: 'p1',
    title: 'Problem 1',
    image: '/images/structure1.png',
    imageNoSupports: '/images/structure1_nosupports.png',
    solutionJson:'/solutions/structure1.json'
    // Optional future hooks:
    // supportConfigPath: '/config/supports_structure1.json',
    // solutionConfigPath: '/config/structure1.json',
  },
  {
    id: 'p2',
    title: 'Problem 2',
    image: '/images/structure2.png',
    imageNoSupports: '/images/structure2_nosupports.png',
    solutionJson:'/solutions/structure2.json',
    // NEW for exploded stage:
    explodedImage: '/images/structure2_exploded.png',
    explodedSolutionJson: '/solutions/structure2_exploded.json'
  },
  {
    id: 'p3',
    title: 'Problem 3',
    image: '/images/structure3.png',
    imageNoSupports: '/images/structure3_nosupports.png',
    solutionJson:'/solutions/structure3.json',
    // NEW for exploded stage:
    explodedImage: '/images/structure3_exploded.png',
    explodedSolutionJson: '/solutions/structure3_exploded.json'
  },
  {
    id: 'p4',
    title: 'Problem 4',
    image: '/images/structure4.png',
    imageNoSupports: '/images/structure4_nosupports.png',
    solutionJson:'/solutions/structure4.json'
  },
  {
    id: 'p5',
    title: 'Problem 5',
    image: '/images/structure5.png',
    imageNoSupports: '/images/structure5_nosupports.png',
    solutionJson:'/solutions/structure5.json'
  },
  {
    id: 'p6',
    title: 'Problem 6',
    image: '/images/structure6.png',
    imageNoSupports: '/images/structure6_nosupports.png',
    solutionJson:'/solutions/structure6.json'
  }
];

export default problems;

