import './style.css'
import a from './A.png'
import b from './B.png'

async function yolo() {
  // load a into canvas #a
  const canvasA = document.getElementById('a');
  const imgA = new Image();
  imgA.src = a;
  await imgA.decode();

  // canvas size based on base image, as this is the what is displayed (+ highlights from the compareImg)
  canvasA.width = imgA.width;
  canvasA.height = imgA.height;

  const ctx = canvasA.getContext('2d');
  if (ctx === null) {
    return;
  }

  // ctx.fillStyle = 'white';
  // ctx.fillRect(0, 0, canvasA.width, canvasA.height);
  ctx.drawImage(imgA, 0, 0);


  // load a into canvas #a
  const canvasB = document.getElementById('b');
  const imgB = new Image();
  imgB.src = b;
  await imgB.decode();

  // canvas size based on base image, as this is the what is displayed (+ highlights from the compareImg)
  canvasB.width = imgA.width;
  canvasB.height = imgA.height;

  const ctxB = canvasB.getContext('2d');
  if (ctxB === null) {
    return;
  }

  // ctxB.fillStyle = 'white';
  // ctxB.fillRect(0, 0, canvasB.width, canvasB.height);
  ctxB.drawImage(imgB, 0, 0);

  const baseImgData = ctx.getImageData(0, 0, canvasA.width, canvasA.height);
  const baseImg = cv.matFromImageData(baseImgData);

  const compareImageData = ctxB.getImageData(0, 0, canvasB.width, canvasB.height);
  const compareImg = cv.matFromImageData(compareImageData);

  const orb = new cv.ORB();
  const baseKeypoints = new cv.KeyPointVector();
  const compareKeypoints = new cv.KeyPointVector();
  const baseDescriptors = new cv.Mat();
  const compareDescriptors = new cv.Mat();
  orb.detectAndCompute(baseImg, new cv.Mat(), baseKeypoints, baseDescriptors);
  orb.detectAndCompute(compareImg, new cv.Mat(), compareKeypoints, compareDescriptors);

  const bfMatcher = new cv.BFMatcher(cv.NORM_HAMMING, true);
  const matches = new cv.DMatchVector();
  bfMatcher.match(baseDescriptors, compareDescriptors, matches);
  let matchScore = 0;
  for (let i = 0; i < matches.size(); i++) {
    matchScore += matches.get(i).distance;
  }
  matchScore /= matches.size();
  const descriptorBits = 32 * 8; // see https://docs.opencv.org/4.8.0/db/d95/classcv_1_1ORB.html#ac166094ca013f59bfe3df3b86fa40bfe
  matchScore /= descriptorBits; // normalize
  console.log('matchScore', matchScore);
  // show score in #score
  const score = document.getElementById('score');
  if (score !== null) {
    // format to 3 floating points
    score.innerText = matchScore.toFixed(3);
  }

  let diffImg = new cv.Mat();
  cv.absdiff(compareImg, baseImg, diffImg);
  const grayImg = new cv.Mat();
  cv.cvtColor(diffImg, grayImg, cv.COLOR_BGR2GRAY);

  const th = 1;
  const imask = new cv.Mat();
  cv.threshold(grayImg, imask, th, 255, cv.THRESH_BINARY);
  cv.imshow('mask', imask);

  const kernel = cv.Mat.ones(5, 5, cv.CV_8U);
  const dilate = new cv.Mat();
  // get iterations from slider #dilateIterations
  let slider = document.getElementById('dilateIterations');
  let iterations = slider != null ? parseInt((slider).value) : 2;

  cv.dilate(imask, dilate, kernel, new cv.Point(-1, -1), iterations, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
  cv.imshow('dilate', dilate);

  const erode = new cv.Mat();
  slider = document.getElementById('erodeIterations');
  iterations = slider != null ? parseInt((slider).value) : 2;
  cv.erode(dilate, erode, kernel, new cv.Point(-1, -1), iterations, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
  cv.imshow('erode', erode);


  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(erode, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  try {
    const contoursArray = [];
    for (let i = 0; i < contours.size(); i++) {
      contoursArray.push(contours.get(i));
    }

    let diffImg = new cv.Mat();
    let mask = new cv.Mat();
    let dtype = -1;
    cv.addWeighted(compareImg, 0.5, baseImg, 0.5, 0, diffImg, dtype);

      
    slider = document.getElementById('contourArea');
    const minArea = slider != null ? parseInt((slider).value) : 100;

    for (const contour of contoursArray) {
      if (cv.contourArea(contour) > minArea) {
        const rect = cv.boundingRect(contour);
        const pt1 = new cv.Point(rect.x, rect.y);
        const pt2 = new cv.Point(rect.x + rect.width, rect.y + rect.height);
        cv.rectangle(diffImg, pt1, pt2, new cv.Scalar(0, 0, 255), 2);
        cv.rectangle(diffImg, pt1, pt2, new cv.Scalar(0, 0, 255), 2);
      }
    }


    cv.imshow('diff', diffImg);
  } catch (e) {
    console.error(e);
  }

  // const canvas = new cv.Mat.ones(compareImg.size(), compareImg.type());
  // compareImg.copyTo(canvas, imask); // copy the pixels from img to canvas where mask is non-zero
  // cv.imshow('diff', canvas);



  // let diffImg = new cv.Mat();
  // let mask = new cv.Mat();
  // let dtype = -1;
  // cv.add(compareImg, baseImg, diffImg, mask, dtype);
  // cv.imshow('diff', diffImg);
  // mask.delete();


  // let diffImg = new cv.Mat();
  // let mask = new cv.Mat();
  // let dtype = -1;
  // cv.addWeighted(compareImg, 0.5, baseImg, 0.5, 0, diffImg, dtype);
  // cv.imshow('diff', diffImg);
  // mask.delete();


  console.log('moin');

  // count how many array elements are unequal zero in diffimg
  // let diffCount = 0;
  // for (let i = 0; i < diffImg.data.length; i++) {
  //   if (diffImg.data[i] !== 0) {
  //     diffCount++;
  //   }
  // }

  // console.log('diffCount', diffCount);

  baseImg.delete();
  compareImg.delete();
  baseKeypoints.delete();
  compareKeypoints.delete();
  baseDescriptors.delete();
  compareDescriptors.delete();
  matches.delete();
  // diffImg.delete();
};


if (cv.getBuildInformation) {
  // console.log(cv.getBuildInformation());
  yolo();
}
else {
  // WASM
  console.log('WASM');
  cv['onRuntimeInitialized'] = () => {
    // console.log(cv.getBuildInformation());
    yolo();
  }
}

const syncCheckbox = document.getElementById('syncIterations');
const dilateInput = document.getElementById('dilateIterations');
const erodeInput = document.getElementById('erodeIterations');

syncCheckbox.addEventListener('change', () => {
  if (syncCheckbox.checked) {
    erodeInput.value = dilateInput.value;
  }
});

dilateInput.addEventListener('input', () => {
  if (syncCheckbox.checked) {
    erodeInput.value = dilateInput.value;
  }
});

erodeInput.addEventListener('input', () => {
  if (syncCheckbox.checked) {
    dilateInput.value = erodeInput.value;
  }
});

let timeoutId;

[
  document.getElementById('dilateIterations'),
  document.getElementById('erodeIterations'),
  document.getElementById('contourArea')
].forEach((slider) => {
  if (slider !== null) {
    slider.addEventListener('input', () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        yolo();
        timeoutId = undefined;
      }, 700);
    });
  }
});