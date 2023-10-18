import "./style.css";
// import a from "/swarm1.png";
// import b from "/swarm2.png";
import a from "./A.png";
import b from "./B.png";

// inspired by https://github.com/kostasthanos/Spot-The-Differences

let score = undefined;

async function yolo() {
  // load a into canvas #a
  const canvasA = document.getElementById("a");
  const imgA = new Image();
  imgA.src = a;
  await imgA.decode();

  // canvas size based on base image, as this is the what is displayed (+ highlights from the compareImg)
  canvasA.width = imgA.width;
  canvasA.height = imgA.height;

  const ctx = canvasA.getContext("2d");
  if (ctx === null) {
    return;
  }

  // ctx.fillStyle = 'white';
  // ctx.fillRect(0, 0, canvasA.width, canvasA.height);
  ctx.drawImage(imgA, 0, 0);

  // load a into canvas #a
  const canvasB = document.getElementById("b");
  const imgB = new Image();
  imgB.src = b;
  await imgB.decode();

  // canvas size based on base image, as this is the what is displayed (+ highlights from the compareImg)
  canvasB.width = imgA.width;
  canvasB.height = imgA.height;

  const ctxB = canvasB.getContext("2d");
  if (ctxB === null) {
    return;
  }

  // fill with white first  in case it is smaller
  ctxB.fillStyle = "white";
  ctxB.fillRect(0, 0, canvasB.width, canvasB.height);
  ctxB.drawImage(imgB, 0, 0);

  const baseImgData = ctx.getImageData(0, 0, canvasA.width, canvasA.height);
  const baseImg = cv.matFromImageData(baseImgData);

  const compareImageData = ctxB.getImageData(
    0,
    0,
    canvasB.width,
    canvasB.height,
  );
  const compareImg = cv.matFromImageData(compareImageData);

  if(score === undefined) {
    score = orbScore(baseImg, compareImg);

    // show score in #score
    const scoreElem = document.getElementById("score");
    if (scoreElem !== null) {
      // format to 3 floating points
      scoreElem.innerText = score.toFixed(3);
    }
  }
  
  const addedContours = getDiffContours(baseImg, compareImg);
  const removedContours = getDiffContours(compareImg, baseImg);

  try {
    const contourAreaInput = document.getElementById("contourArea");
    const maxArea =
      contourAreaInput != null ? parseInt(contourAreaInput.value) : Infinity;

    const thickness = 2;
    const contourDrawOpacity = 255; // draw contour fully opaque because it would set the pixels' opacity and not make the contour itself transparent
    let overlayWeight = 0.75; // instead, draw contours on a copy of the image and blend it with the original image to achieve a transparency effect
    const rectangle =
      document.querySelector('input[name="contourType"]:checked').value ===
      "rectangle";
    // draw added contours on compareImage
    for (const contour of addedContours) {
      if (cv.contourArea(contour) < maxArea) {
        // see if rectangle radio button is checked
        let color = new cv.Scalar(102, 194, 165, contourDrawOpacity);

        // draw contours as rectangle or convex hull. see https://docs.opencv.org/3.4/dd/d49/tutorial_py_contour_features.html
        if (rectangle) {
          const rect = cv.boundingRect(contour);
          const pt1 = new cv.Point(rect.x, rect.y);
          const pt2 = new cv.Point(rect.x + rect.width, rect.y + rect.height);

          let overlay = compareImg.clone();
          cv.rectangle(overlay, pt1, pt2, color, thickness); // scaler = color in RGB-Opacity format
          cv.addWeighted(
            overlay,
            overlayWeight,
            compareImg,
            1 - overlayWeight,
            0,
            compareImg,
            -1,
          );
        } else {
          let hull = new cv.Mat();
          cv.convexHull(contour, hull, false, true);

          // Draw the convex hull
          let lineType = cv.LINE_8;
          const hulls = new cv.MatVector();
          hulls.push_back(hull);

          let overlay = compareImg.clone();
          cv.drawContours(overlay, hulls, 0, color, thickness, lineType);
          cv.addWeighted(
            overlay,
            overlayWeight,
            compareImg,
            1 - overlayWeight,
            0,
            compareImg,
            -1,
          );
        }
      }
    }

    // draw removed contours on base Image
    for (const contour of removedContours) {
      if (cv.contourArea(contour) < maxArea) {
        let color = new cv.Scalar(240, 82, 104, contourDrawOpacity);
        if (rectangle) {
          const rect = cv.boundingRect(contour);
          const pt1 = new cv.Point(rect.x, rect.y);
          const pt2 = new cv.Point(rect.x + rect.width, rect.y + rect.height);

          let overlay = baseImg.clone();
          cv.rectangle(overlay, pt1, pt2, color, thickness); // scaler = color in RGB-Opacity format
          cv.addWeighted(
            overlay,
            overlayWeight,
            baseImg,
            1 - overlayWeight,
            0,
            baseImg,
            -1,
          );
        } else {
          let hull = new cv.Mat();
          cv.convexHull(contour, hull, false, true);

          // Draw the convex hull
          let lineType = cv.LINE_8;
          const hulls = new cv.MatVector();
          hulls.push_back(hull);

          let overlay = baseImg.clone();
          cv.drawContours(overlay, hulls, 0, color, thickness, lineType);
          cv.addWeighted(
            overlay,
            overlayWeight,
            baseImg,
            1 - overlayWeight,
            0,
            baseImg,
            -1,
          );
          // cv.drawContours(baseImg, hulls, 0, color, thickness, lineType);s
        }
      }
    }

    // merge the images
    const transparencySlider = document.getElementById("transparency");
    const transparency =
      transparencySlider != null ? parseFloat(transparencySlider.value) : 0;

    let diffImg = new cv.Mat();
    let dtype = -1;
    cv.addWeighted(
      compareImg,
      0.5 + transparency,
      baseImg,
      0.5 - transparency,
      0,
      diffImg,
      dtype,
    );

    cv.imshow("diff", diffImg);
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
  // diffImg.delete();
}

if (cv.getBuildInformation) {
  // console.log(cv.getBuildInformation());
  yolo();
} else {
  // WASM
  console.log("WASM");
  cv["onRuntimeInitialized"] = () => {
    // console.log(cv.getBuildInformation());
    yolo();
  };
}

const syncCheckbox = document.getElementById("syncIterations");
const dilateInput = document.getElementById("dilateIterations");
const erodeInput = document.getElementById("erodeIterations");

syncCheckbox.addEventListener("change", () => {
  if (syncCheckbox.checked) {
    erodeInput.value = dilateInput.value;
  }
});

dilateInput.addEventListener("input", () => {
  if (syncCheckbox.checked) {
    erodeInput.value = dilateInput.value;
  }
});

erodeInput.addEventListener("input", () => {
  if (syncCheckbox.checked) {
    dilateInput.value = erodeInput.value;
  }
});

let timeoutId;

[
  document.getElementById("dilateIterations"),
  document.getElementById("erodeIterations"),
  document.getElementById("contourArea"),
  document.getElementById("transparency"),
  document.getElementById("transparency"),
  ...document.querySelectorAll(`input[name="contourType"]`),
].forEach((slider) => {
  if (slider !== null) {
    slider.addEventListener("input", () => {
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
function getDiffContours(compareImg, baseImg) {
  let diffImg = new cv.Mat();
  // cv.absdiff(compareImg, baseImg, diffImg);
  cv.subtract(compareImg, baseImg, diffImg);
  const grayImg = new cv.Mat();
  cv.cvtColor(diffImg, grayImg, cv.COLOR_BGR2GRAY);

  const th = 1;
  const imask = new cv.Mat();
  cv.threshold(grayImg, imask, th, 255, cv.THRESH_BINARY);
  cv.imshow("mask", imask);

  const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
  const dilate = new cv.Mat();
  // get iterations from slider #dilateIterations
  let slider = document.getElementById("dilateIterations");
  let iterations = slider != null ? parseInt(slider.value) : 2;

  cv.dilate(
    imask,
    dilate,
    kernel,
    new cv.Point(-1, -1),
    iterations,
    cv.BORDER_CONSTANT,
    cv.morphologyDefaultBorderValue(),
  );
  cv.imshow("dilate", dilate);

  const erode = new cv.Mat();
  slider = document.getElementById("erodeIterations");
  iterations = slider != null ? parseInt(slider.value) : 2;
  cv.erode(
    dilate,
    erode,
    kernel,
    new cv.Point(-1, -1),
    iterations,
    cv.BORDER_CONSTANT,
    cv.morphologyDefaultBorderValue(),
  );
  cv.imshow("erode", erode);

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  // RETR_EXTERNAL ... returns only extreme outer flags. All child contours are left behind. see https://docs.opencv.org/4.x/d9/d8b/tutorial_py_contours_hierarchy.html
  cv.findContours(
    erode,
    contours,
    hierarchy,
    cv.RETR_EXTERNAL,
    cv.CHAIN_APPROX_SIMPLE,
  );
  const contoursArray = [];
  for (let i = 0; i < contours.size(); i++) {
    contoursArray.push(contours.get(i));
  }

  // Filter out contours that are within others
  const filteredContours = new Set();
  for (let i = 0; i < contoursArray.length; i++) {
    const boundingRectA = cv.boundingRect(contoursArray[i]);
    let aWasNestedAtLeastOnce = false;
    for (let j = i + 1; j < contoursArray.length; j++) {
      const boundingRectB = cv.boundingRect(contoursArray[j]);

      const aIsInB =
        boundingRectB.x <= boundingRectA.x &&
        boundingRectB.y <= boundingRectA.y && // is A's top left corner inside B?
        boundingRectB.x + boundingRectB.width >=
          boundingRectA.x + boundingRectA.width && // is A's width smaller than B's?
        boundingRectB.y + boundingRectB.height >=
          boundingRectA.y + boundingRectA.height; // is A's height smaller than B's?

      if (aIsInB) {
        // B is within A
        aWasNestedAtLeastOnce = true;
      } else {
        // noop
      }
    }
    if (!aWasNestedAtLeastOnce) {
      filteredContours.add(contoursArray[i]);
    }
  }

  return filteredContours;
}

function orbScore(baseImg, compareImg) {
  const orb = new cv.ORB();
  const baseKeypoints = new cv.KeyPointVector();
  const compareKeypoints = new cv.KeyPointVector();
  const baseDescriptors = new cv.Mat();
  const compareDescriptors = new cv.Mat();
  orb.detectAndCompute(baseImg, new cv.Mat(), baseKeypoints, baseDescriptors);
  orb.detectAndCompute(
    compareImg,
    new cv.Mat(),
    compareKeypoints,
    compareDescriptors,
  );

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

  baseKeypoints.delete();
  compareKeypoints.delete();
  baseDescriptors.delete();
  compareDescriptors.delete();
  matches.delete();

  return matchScore;
}
