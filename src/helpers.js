const radians = (degrees) => {
  return degrees * Math.PI / 180;
}

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : null;
}

const rgbToHex = s => s.match(/[0-9]+/g).reduce((a, b) => a + (b | 256).toString(16).slice(1), '#')

const rInterval = function (callback, delay) {
  const dateNow = Date.now;
  const requestAnimation = window.requestAnimationFrame;
  let start = dateNow();
  let stop;

  const intervalFunc = function () {
    dateNow() - start < delay || (start += delay, callback());
    stop || requestAnimation(intervalFunc);
  };

  requestAnimation(intervalFunc);

  return {
    clear: function () { stop = 1 },
  };
}

export {
  rInterval,
  radians,
  rgbToHex,
  hexToRgb,
};
