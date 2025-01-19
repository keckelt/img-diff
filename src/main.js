import "./style.css";
import size1 from "/size1.png";
import size2 from "/size2.png";
import legend1 from "/legend1.png";
import legend2 from "/legend2.png";
import newData1 from "/newData1.png";
import newData2 from "/newData2.png";
import bear1 from "/bear1.png";
import bear2 from "/bear2.png";

// inspired by https://github.com/kostasthanos/Spot-The-Differences

let score = undefined;

async function yolo() {
  const imageSet = document.querySelector('input[name="imageset"]:checked')?.value ?? 'legend';
  console.log('imageSet');

  let oldImgInput = legend1;
  let newImageInput = legend2;
  if ( imageSet === 'size') {
    oldImgInput = size1;
    newImageInput = size2;
  } else if (imageSet === 'newData'){
    oldImgInput = newData1;
    newImageInput= newData2;
  } else if (imageSet === 'bear'){
    oldImgInput = bear1;
    newImageInput= bear2;
  }

  // load a into canvas #a
  const canvasA = document.getElementById("a");
  const imgA = new Image();
  imgA.src = oldImgInput;
  await imgA.decode();

  // canvas size based on base image, as this is the what is displayed (+ highlights from the compareImg)
  canvasA.width = imgA.width;
  canvasA.height = imgA.height;

  const ctx = canvasA.getContext("2d");
  if (ctx === null) {
    return;
  }

  ctx.drawImage(imgA, 0, 0);

  
  const bgColor = getBackgroundColor(ctx, imgA.width, imgA.height, 50);
  console.log('bgColor', bgColor);

  // load a into canvas #a
  const canvasB = document.getElementById("b");
  const imgB = new Image();
  imgB.src = newImageInput;
  await imgB.decode();

  // canvas size based on base image, as this is the what is displayed (+ highlights from the compareImg)
  canvasB.width = imgA.width;
  canvasB.height = imgA.height;

  const ctxB = canvasB.getContext("2d");
  if (ctxB === null) {
    return;
  }

  // fill with backgroundColor first  in case this image is smaller
  ctxB.fillStyle = `rgba(${bgColor.join(",")})`;
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

  if (score === undefined) {
    // compute the score only once
    score = orbScore(baseImg, compareImg);

    // show score in #score
    const scoreElem = document.getElementById("score");
    if (scoreElem !== null) {
      // format to 3 floating points
      scoreElem.innerText = score.toFixed(3);
    }
  }
  const changeArea = document.querySelector('input[name="contourType"]:checked').value;

  const isDiffWithContours = changeArea !== "pixels";

  const diffRemoved = getDiff(compareImg, baseImg, true);
  const diffAdded = getDiff(baseImg, compareImg, true);

  const contourAreaInput = document.getElementById("contourArea");

  const thickness = -1; // -1 = filled, 1 = 1px thick, 2 = 2px thick, ...
  const contourDrawOpacity = 255; // draw contour fully opaque because it would set the pixels' opacity and not make the contour itself transparent
  let diffOverlayWeight = 0.66; // instead, draw contours on a copy of the image and blend it with the original image to achieve a transparency effect
  const colorAdd = new cv.Scalar(102, 194, 165, contourDrawOpacity);
  const colorRemove = new cv.Scalar(240, 82, 104, contourDrawOpacity);

  if (changeArea === "pixels") {
    // pixelDiff(compareImg, diffAdded.img, diffRemoved.img, diffOverlayWeight, colorAdd);
    pixelDiff(baseImg, diffRemoved.img,  diffAdded.img, diffOverlayWeight, colorRemove);

    
    diffAdded.img.delete();
    diffRemoved.img.delete();
  } else {
    drawContours(
      compareImg,
      diffAdded.contours,
      colorAdd,
      thickness,
      diffOverlayWeight,
      changeArea,
    );
    drawContours(
      baseImg,
      diffRemoved.contours,
      colorRemove,
      thickness,
      diffOverlayWeight,
      changeArea,
    );
  }

  // merge the images
  const transparencySlider = document.getElementById("transparency");
  const transparency =
    transparencySlider != null ? parseFloat(transparencySlider.value) : 0;

  let diffImg = new cv.Mat();
  cv.addWeighted(
    compareImg,
    0.5 + transparency,
    baseImg,
    0.5 - transparency,
    0,
    diffImg,
  );

  cv.imshow("diff", diffImg);

  document.getElementById("summary").innerText = `${diffRemoved.contours.length} removed and ${diffAdded.contours.length} added regions.`;

  baseImg.delete();
  compareImg.delete();
  diffImg.delete();
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
  ...document.querySelectorAll(`input[name="imageset"]`),
].forEach((slider) => {
  if (slider !== null) {
    slider.addEventListener("input", (event) => {
      //clear score variable if imageset input fired the event
      if (event.target.name === 'imageset') {
        score = undefined;
      }


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
function pixelDiff(target, mask, mask2, diffOverlayWeight, color, colorBoth) {
  const overlay = target.clone();

  const maskData = mask.data;
  let similarPixels = maskData.length;

  for (let i = 0; i < maskData.length; i += 1) {
    const rgbaIndex = i * 4;
    if (
      maskData[i] !== 0 && // mask is not black
      mask2.data[i] === 0 // mask2 is black
      //  &&
      // //overlay is white
      // overlay.data[rgbaIndex] === 255 &&
      // overlay.data[rgbaIndex + 1] === 255 &&
      // overlay.data[rgbaIndex + 2] === 255
    ) {
      overlay.data[rgbaIndex] = color[0];
      overlay.data[rgbaIndex + 1] = color[1];
      overlay.data[rgbaIndex + 2] = color[2];
      similarPixels--; // TODO check for similar on-white pixels instead?
    } else if (
      maskData[i] !== 0 && // mask is not black
      mask2.data[i] !== 0 // mask2 is black
    ) {
      overlay.data[rgbaIndex] = 251;
      overlay.data[rgbaIndex + 1] = 225;
      overlay.data[rgbaIndex + 2] = 86;
    } else if (
      colorBoth &&
      maskData[i] === 0 && // mask is black
      mask2.data[i] !== 0 // mask2 is not black
    ) {
      overlay.data[rgbaIndex] = 240;
      overlay.data[rgbaIndex + 1] = 82;
      overlay.data[rgbaIndex + 2] = 104;
    } else {
      overlay.data[rgbaIndex] = 0;
      overlay.data[rgbaIndex + 1] = 0;
      overlay.data[rgbaIndex + 2] = 0;
    }
  }
  cv.imshow("erode", overlay);

  cv.addWeighted(overlay, diffOverlayWeight, target, 1 - diffOverlayWeight, 0, target, -1);
  // console.log('similarPixels', similarPixels, 'differentPixels', maskData.length - similarPixels);
  // console.log('pixelSimilartiy', similarPixels / maskData.length);
  return similarPixels / maskData.length;
}

function pixelDiff2(target, mask, diffOverlayWeight, color) {
  let overlay = target.clone();

  const maskData = mask.data;
  for (let i = 0; i < maskData.length; i += 1) {
    const rgbaIndex = i * 4;
    if (
      maskData[i] !== 0 // mask is black
      //  &&
      // //overlay is white
      // overlay.data[rgbaIndex] === 255 &&
      // overlay.data[rgbaIndex + 1] === 255 &&
      // overlay.data[rgbaIndex + 2] === 255
    ) {
      overlay.data[rgbaIndex] = color[0];
      overlay.data[rgbaIndex + 1] = color[1];
      overlay.data[rgbaIndex + 2] = color[2];
    }
  }
  cv.addWeighted(
    overlay,
    diffOverlayWeight,
    target,
    1 - diffOverlayWeight,
    0,
    target,
    -1,
  );
}

function getDiff(compareImg, baseImg, calcContours) {
  let diffImg = new cv.Mat();
  cv.subtract(compareImg, baseImg, diffImg);
  const grayImg = new cv.Mat();
  cv.cvtColor(diffImg, grayImg, cv.COLOR_BGR2GRAY);
  
  const th = 15; // up to 10% (26/255) difference is tolerated
  const imask = new cv.Mat();
  cv.threshold(grayImg, imask, th, 255, cv.THRESH_BINARY);
  cv.imshow("mask", grayImg);

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

  diffImg.delete();
  grayImg.delete();
  imask.delete();
  kernel.delete();
  dilate.delete();

  if (!calcContours) {
    return {
      img: erode,
      contours: [],
    };
  }

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

  hierarchy.delete();

  const boundingRects = [];
  for (let i = 0; i < contours.size(); i++) {
    const contour = contours.get(i);
    // Calculate bounding rectangles for all contours
    boundingRects.push(cv.boundingRect(contour));
  }

  // Filter out contours that are within others
  const filteredContours = new Set();

  for (let i = 0; i < boundingRects.length; i++) {
    const boundingRectA = boundingRects[i];
    let aWasNestedAtLeastOnce = false;

    for (let j = 0; j < boundingRects.length; j++) {
      if (i !== j) {
        const boundingRectB = boundingRects[j];

        const aIsInB =
          boundingRectB.x <= boundingRectA.x &&
          boundingRectB.y <= boundingRectA.y &&
          boundingRectB.x + boundingRectB.width >=
            boundingRectA.x + boundingRectA.width &&
          boundingRectB.y + boundingRectB.height >=
            boundingRectA.y + boundingRectA.height;

        if (aIsInB) {
          aWasNestedAtLeastOnce = true;
          break;
        }
      }
    }

    if (!aWasNestedAtLeastOnce) {
      filteredContours.add(contours.get(i));
    } else {
      contours.get(i).delete();
    }
  }

  contours.delete();
  return {
    img: erode,
    contours: Array.from(filteredContours),
  };
}

function orbScore(baseImg, compareImg) {
  const orb = new cv.ORB();
  const baseKeypoints = new cv.KeyPointVector();
  const compareKeypoints = new cv.KeyPointVector();
  const baseDescriptors = new cv.Mat();
  const compareDescriptors = new cv.Mat();
  const mask = new cv.Mat();
  orb.detectAndCompute(baseImg, mask, baseKeypoints, baseDescriptors);
  orb.detectAndCompute(compareImg, mask, compareKeypoints, compareDescriptors);

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

  orb.delete();
  baseKeypoints.delete();
  compareKeypoints.delete();
  baseDescriptors.delete();
  compareDescriptors.delete();
  mask.delete();

  bfMatcher.delete();
  matches.delete();

  return matchScore;
}

function drawContours(
  target,
  contours,
  color,
  thickness,
  diffOverlayWeight,
  type,
) {
  // draw added contours on compareImage
  let overlay = target.clone();
  for (const contour of contours) {
    // draw contours as rectangle or convex hull. see https://docs.opencv.org/3.4/dd/d49/tutorial_py_contour_features.html
    if (type === "rectangle") {
      const rect = cv.boundingRect(contour);
      const pt1 = new cv.Point(rect.x, rect.y);
      const pt2 = new cv.Point(rect.x + rect.width, rect.y + rect.height);

      cv.rectangle(overlay, pt1, pt2, color, thickness); // scaler = color in RGB-Opacity format
    } else if (type === "hull") {
      let hull = new cv.Mat();
      cv.convexHull(contour, hull, false, true);

      // Draw the convex hull
      let lineType = cv.LINE_8;
      const hulls = new cv.MatVector();
      hulls.push_back(hull);

      cv.drawContours(overlay, hulls, 0, color, thickness, lineType); // this could be done for all contours at once, by putting them into a MatVector
      hulls.delete();
    } else {
      throw new Error(`Unknown contour type ${type}`);
    }

    contour.delete();
  }

  cv.addWeighted(
    overlay,
    diffOverlayWeight,
    target,
    1 - diffOverlayWeight,
    0,
    target,
    -1,
  );
  overlay.delete();
}



function getBackgroundColorCV(imageMat) {
  // Define the border width (number of pixels from the border)
  const borderWidth = 10;

  // Get the image dimensions (rows and columns)
  const rows = imageMat.rows;
  const cols = imageMat.cols;

  // Extract the outermost 10 pixels along the top, bottom, left, and right borders
  const topBorder = imageMat.rowRange(0, borderWidth);
  const bottomBorder = imageMat.rowRange(rows - borderWidth, rows);
  const leftBorder = imageMat.colRange(0, borderWidth);
  const rightBorder = imageMat.colRange(cols - borderWidth, cols);

  
  // Concatenate all border regions
  const allBorders = new cv.Mat();

  const topBottom = new cv.MatVector();
  topBottom.push_back(topBorder);
  topBottom.push_back(bottomBorder);
  cv.vconcat(topBottom, allBorders);

  
  const leftRight = new cv.MatVector();
  topBottom.push_back(leftBorder);
  topBottom.push_back(rightBorder);
  cv.hconcat(leftRight, allBorders);
  
  // // Convert the concatenated border regions to a flattened array
  // const borderPixels = allBorders.reshape(-1, 3);
  
  // // Calculate the histogram of colors
  const images = new cv.MatVector();
  images.push_back(allBorders);

  const hist = new cv.Mat();
  cv.calcHist(
    images, // source image
    //  1, // number of images
    [0, 1, 2], // channels
    new cv.Mat(),  // mask
    hist,  // output histogram
    [256, 256, 256], // histogram size/diWensionality
     [0, 256, 0, 256, 0, 256] // ranges
     );
     
     
     // // Find the most frequent color
     
     const maxVal = new cv.Mat();
     console.log('servus')
     cv.minMaxLoc(hist, maxVal);
    //  const mostFrequentColor = cv.minMaxLoc(hist).maxLoc;
  // // Extract RGB values
  // const [b, g, r] = mostFrequentColor;

  // console.log(`Most frequent color (RGB): R=${r}, G=${g}, B=${b}`);
  // return {r,g,b};
}

function getBackgroundColor(ctx, width, height, borderPixels) {
  const topBorder = ctx.getImageData(0, 0, width, borderPixels).data;
  const bottomBorder = ctx.getImageData(0, height-borderPixels, width, borderPixels).data;

  const leftBorder = ctx.getImageData(0, borderPixels, borderPixels, height-borderPixels).data; // left border without top and bottom border
  const rightBorder = ctx.getImageData(width-borderPixels, borderPixels, borderPixels, height-borderPixels).data; // right border without top and bottom border

  //output length of all borders
  // console.log('topBorder', topBorder.length); // width * borderpixels * 4 (rgba)
  // console.log('bottomBorder', bottomBorder.length);
  // console.log('leftBorder', leftBorder.length);
  // console.log('rightBorder', rightBorder.length);
  
  // concat all borders
  const allBorders = new Uint8Array(topBorder.length + bottomBorder.length + leftBorder.length + rightBorder.length);
  allBorders.set(topBorder);
  allBorders.set(bottomBorder, topBorder.length);
  allBorders.set(leftBorder, topBorder.length + bottomBorder.length);
  allBorders.set(rightBorder, topBorder.length + bottomBorder.length + leftBorder.length);

  // find most frequent color
  const colorCount = {};
  let maxColor = undefined;
  let maxCount = 0;
  for (let i = 0; i < allBorders.length; i += 4) {
    const color = allBorders.slice(i, i + 4).join(","); // +4 because rgba and slice end index is exclusive
    colorCount[color] = (colorCount[color] ?? 0) + 1;
    if (colorCount[color] > maxCount) {
      maxCount = colorCount[color];
      maxColor = color;
    }

    // abort early if we found a color that is in the majority
    if (maxCount > (allBorders.length / 4) - i) {
      console.debug(maxColor, 'occurs', maxCount, 'times, aborting early as only', (allBorders.length / 4) - i, 'pixels are left to check');
      break;
    }
  }

  return maxColor.split(",").map((c) => parseInt(c));
}