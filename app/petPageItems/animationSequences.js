const layingDown = [
    { name: 'stayLying', startFrame: 43, frameCount: 1, duration: 1250 }, // 10
    { name: 'blink', startFrame: 45, frameCount: 1, duration: 250 }, // 2
    { name: 'stayLying', startFrame: 43, frameCount: 1, duration: 1250 }, // 10
    { name: 'tailTap', startFrame: 48, frameCount: 8, duration: 1000 }, // 8
    { name: 'stayLying', startFrame: 43, frameCount: 1, duration: 1250 }, // 10
    { name: 'blink', startFrame: 45, frameCount: 1, duration: 250 },// 2
    { name: 'stayLying', startFrame: 43, frameCount: 1, duration: 1250 }, // 10
    // 52 total
];
const idleSitting = [
    { name: 'sitStill', startFrame: 17, frameCount: 1, duration: 2500 }, // 20
    { name: 'sitTail', startFrame: 14, frameCount: 7, duration: 875 }, // 7
    { name: 'groom', startFrame: 21, frameCount: 14, duration: 1750 }, // 14
    { name: 'sitTail', startFrame: 14, frameCount: 7, duration: 875 }, // 7
    { name: 'sitStill', startFrame: 17, frameCount: 1, duration: 750 }, // 6
    { name: 'sitStill', startFrame: 17, frameCount: 1, duration: 750 }, // 6
    //  60 total
]
const basicLoop = [
    ...layingDown, // 52
    ...layingDown, // 52
    { name: 'getUp', startFrame: 0, frameCount: 15, duration: 1875 }, // 15
    { name: 'sitTail', startFrame: 14, frameCount: 7, duration: 875 }, // 7
    ...idleSitting, // 60
    ...idleSitting, // 60
    { name: 'layDown', startFrame: 37, frameCount: 7, duration: 875 }, // 7
    // 253
];


const heartPop = [
    { name: 'heartPop', startFrame: 0, frameCount: 9, duration: 1125 },
];


export {basicLoop, layingDown, heartPop, idleSitting};