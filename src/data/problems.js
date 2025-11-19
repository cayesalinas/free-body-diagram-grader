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
];

export default problems;

