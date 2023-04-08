var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
class ControlPosition {
  constructor(targetElement, eventElement, configs) {
    __publicField(this, "factor", 0.05);
    __publicField(this, "minScale", 0.1);
    __publicField(this, "maxScale", 10);
    __publicField(this, "ts", {
      scale: 1,
      rotate: 0,
      translate: {
        x: 0,
        y: 0
      }
    });
    __publicField(this, "filter", {
      contrast: 1,
      saturate: 1,
      brightness: 1
    });
    __publicField(this, "loopTime", { start: null, end: null });
    __publicField(this, "restrictPosition");
    __publicField(this, "before");
    __publicField(this, "after");
    __publicField(this, "restrictXY", (currentPosition) => {
      let { x, y } = currentPosition;
      if (!this.targetElement)
        return { x, y };
      if (!this.restrictPosition) {
        return { x, y };
      }
      const imageBound = this.targetElement.getBoundingClientRect();
      return this.restrictPosition(currentPosition, imageBound);
    });
    __publicField(this, "decompose_2d_matrix", (mat) => {
      const { a, b, c, d, e, f } = mat;
      let delta = a * d - b * c;
      let result = {
        translation: [e, f],
        deg: 0,
        rotation: 0,
        scale: [0, 0],
        skew: [0, 0]
      };
      if (a !== 0 || b !== 0) {
        let r = Math.sqrt(a * a + b * b);
        result.rotation = b > 0 ? Math.acos(a / r) : -Math.acos(a / r);
        result.scale = [r, delta / r];
        result.skew = [Math.atan((a * c + b * d) / (r * r)), 0];
      } else if (c !== 0 || d !== 0) {
        let s = Math.sqrt(c * c + d * d);
        result.rotation = Math.PI / 2 - (d > 0 ? Math.acos(-c / s) : -Math.acos(c / s));
        result.scale = [delta / s, s];
        result.skew = [0, Math.atan((a * c + b * d) / (s * s))];
      } else
        ;
      if (Math.abs(result.rotation) === 0)
        result.rotation = 0;
      const degree = result.rotation * (180 / Math.PI);
      result.deg = degree < 0 ? degree + 360 : degree;
      return {
        scale: result.scale[0],
        rotate: result.deg,
        translate: {
          x: result.translation[0],
          y: result.translation[1]
        }
      };
    });
    __publicField(this, "isTranslateValues", (value) => {
      return value !== void 0 && "translate" in value && "rotate" in value && "scale" in value;
    });
    __publicField(this, "isFilter", (value) => {
      return value !== void 0 && "contrast" in value && "brightness" in value && "saturate" in value;
    });
    __publicField(this, "getPosition", (el) => {
      const matrix = new WebKitCSSMatrix(
        window.getComputedStyle(el ?? this.targetElement).transform
      );
      return this.decompose_2d_matrix(matrix);
    });
    __publicField(this, "updatePosition", (value) => {
      if (this.isTranslateValues(value)) {
        this.ts = value;
      } else {
        this.ts = value(this.getPosition());
      }
      this.setTransform();
    });
    __publicField(this, "loadTransform", () => {
      const tsString = localStorage.getItem("ytf-transform");
      const filterString = localStorage.getItem("ytf-filter");
      if (tsString) {
        const parse = JSON.parse(tsString);
        if (this.isTranslateValues(parse)) {
          this.ts = parse;
          this.setTransform();
        }
      }
      if (filterString) {
        const parse = JSON.parse(filterString);
        if (this.isFilter(parse)) {
          this.filter = parse;
          this.setFilter();
        }
      }
    });
    __publicField(this, "setTransform", () => {
      if (this.before)
        this.before();
      localStorage.setItem("ytf-transform", JSON.stringify(this.ts));
      this.targetElement.style.transform = `translate(${this.ts.translate.x}px,${this.ts.translate.y}px) scale(${this.ts.scale}) rotate(${this.ts.rotate}deg)`;
      if (this.after)
        this.after();
    });
    __publicField(this, "setFilter", () => {
      if (this.before)
        this.before();
      localStorage.setItem("ytf-filter", JSON.stringify(this.filter));
      Object.keys(this.filter).forEach((keyName) => {
        const spanTarget = document.querySelector(
          `.ytf-${keyName}`
        );
        if (spanTarget) {
          spanTarget.textContent = String(
            Math.floor(this.filter[keyName] * 100) / 100
          );
        }
      });
      this.targetElement.style.filter = `contrast(${this.filter.contrast}) saturate(${this.filter.saturate}) brightness(${this.filter.brightness})`;
      if (this.after)
        this.after();
    });
    __publicField(this, "toggleRotation", (value) => {
      value = Math.abs(value);
      return value === 0 ? 90 : value === 90 ? 180 : value === 180 ? 270 : 0;
    });
    this.targetElement = targetElement;
    this.eventElement = eventElement;
    if (configs == null ? void 0 : configs.factor)
      this.factor = configs.factor;
    if (configs == null ? void 0 : configs.minScale)
      this.minScale = configs.minScale;
    if (configs == null ? void 0 : configs.maxScale)
      this.maxScale = configs.maxScale;
    if (configs == null ? void 0 : configs.before)
      this.before = configs.before;
    if (configs == null ? void 0 : configs.after)
      this.after = configs.after;
    if (configs == null ? void 0 : configs.restrictPosition)
      this.restrictPosition = configs.restrictPosition;
  }
}
class Drag extends ControlPosition {
  constructor() {
    super(...arguments);
    __publicField(this, "inertiaAnimationFrame", -1);
    __publicField(this, "isDrag", false);
    __publicField(this, "isScale", false);
    __publicField(this, "dragged", false);
    __publicField(this, "threshold", 1);
    __publicField(this, "startPoint", {
      x: 0,
      y: 0
    });
    __publicField(this, "previousPosition", {
      x: 0,
      y: 0
    });
    __publicField(this, "maximumInertia", 40);
    __publicField(this, "velocity", {
      x: 0,
      y: 0
    });
    __publicField(this, "deceleration", 0.9);
    __publicField(this, "startDist", 0);
    __publicField(this, "startScale", 1);
    __publicField(this, "capSpeed", (value) => {
      let res = 0;
      if (Math.abs(value) > this.maximumInertia) {
        res = this.maximumInertia;
        res *= value < 0 ? -1 : 1;
        return res;
      }
      return value;
    });
    __publicField(this, "updateInertia", () => {
      if (!this.targetElement)
        return;
      this.velocity.x = this.velocity.x * this.deceleration;
      this.velocity.y = this.velocity.y * this.deceleration;
      this.velocity.x = Math.round(this.velocity.x * 10) / 10;
      this.velocity.y = Math.round(this.velocity.y * 10) / 10;
      this.ts.translate.x = Math.round(this.ts.translate.x + this.velocity.x);
      this.ts.translate.y = Math.round(this.ts.translate.y + this.velocity.y);
      this.setTransform();
      if (Math.floor(Math.abs(this.velocity.x)) !== 0 || Math.floor(Math.abs(this.velocity.y)) !== 0) {
        this.inertiaAnimationFrame = requestAnimationFrame(this.updateInertia);
      }
    });
    __publicField(this, "dragFinish", () => {
      this.velocity = {
        x: this.capSpeed(this.restrictXY(this.velocity).x),
        y: this.capSpeed(this.restrictXY(this.velocity).y)
      };
      if (this.velocity.x !== 0 || this.velocity.y !== 0) {
        this.inertiaAnimationFrame = requestAnimationFrame(this.updateInertia);
      }
    });
  }
}
const degrees = [0, 90, 180, 270];
const toggleDegrees = (currentDegreeIndex) => {
  const max = degrees.length - 1;
  if (currentDegreeIndex + 1 > max)
    return 0;
  return degrees[currentDegreeIndex + 1];
};
class DragZoom extends Drag {
  constructor() {
    super(...arguments);
    __publicField(this, "isPlaying", false);
    __publicField(this, "bezelTimeout");
    __publicField(this, "key", (event) => {
      if (event.code === "KeyR") {
        this.ts = this.getPosition();
        const currentDegree = this.ts.rotate;
        const currentDegreeIndex = degrees.findIndex(
          (item) => item === currentDegree
        );
        this.ts = { ...this.ts, rotate: toggleDegrees(currentDegreeIndex) };
        this.setTransform();
      }
    });
    __publicField(this, "hasTransformed", () => {
      if (this.ts.rotate !== 0 || this.ts.scale !== 1 || this.ts.translate.x !== 0 || this.ts.translate.y !== 0) {
        return true;
      }
      return false;
    });
    __publicField(this, "restore", () => {
      this.ts = {
        rotate: 0,
        scale: 1,
        translate: {
          x: 0,
          y: 0
        }
      };
      this.setTransform();
    });
    __publicField(this, "on", (event) => {
      const moveOn = localStorage.getItem("ytme-move");
      if (!moveOn)
        return;
      if (moveOn === "false")
        return;
      const currentVideo2 = document.querySelector("video");
      if (currentVideo2) {
        this.isPlaying = !currentVideo2.paused;
      }
      if (event.button) {
        if (event.preventDefault != void 0)
          event.preventDefault();
        if (event.stopPropagation != void 0)
          event.stopPropagation();
        this.restore();
        event.cancelBubble = false;
        return false;
      }
      this.ts = this.getPosition();
      if (this.isTouchEvent(event) && event.touches.length === 2) {
        this.isDrag = false;
        this.isScale = true;
        this.startDist = Math.hypot(
          event.touches[0].pageX - event.touches[1].pageX,
          event.touches[0].pageY - event.touches[1].pageY
        );
        this.startScale = this.ts.scale;
      } else {
        cancelAnimationFrame(this.inertiaAnimationFrame);
        this.isDrag = true;
        this.isScale = false;
        this.startPoint = {
          x: this.isTouchEvent(event) ? event.touches[0].pageX : event.pageX,
          y: this.isTouchEvent(event) ? event.touches[0].pageY : event.pageY
        };
        this.previousPosition = {
          x: this.ts.translate.x,
          y: this.ts.translate.y
        };
        this.velocity = { x: 0, y: 0 };
      }
      const eventTarget = this.eventElement ?? this.targetElement;
      if (event.touches) {
        eventTarget.addEventListener("touchmove", this.onMove, { passive: true });
        eventTarget.addEventListener("touchend", this.onEnd);
      } else {
        eventTarget.addEventListener("mousemove", this.onMove, { passive: true });
        eventTarget.addEventListener("mouseup", this.onEnd);
        eventTarget.addEventListener("mouseleave", this.onEnd);
      }
    });
    __publicField(this, "isTouchEvent", (event) => {
      return "touches" in event;
    });
    __publicField(this, "onMove", (event) => {
      if (!this.targetElement)
        return;
      let func = this.eventElement ? this.eventElement.ontouchmove : this.targetElement.ontouchmove;
      this.targetElement.ontouchmove = null;
      if (this.isDrag && (this.isTouchEvent(event) && event.touches.length === 1 || !this.isTouchEvent(event))) {
        const x = this.isTouchEvent(event) ? event.touches[0].pageX : event.pageX;
        const y = this.isTouchEvent(event) ? event.touches[0].pageY : event.pageY;
        const oldX = this.ts.translate.x;
        const oldY = this.ts.translate.y;
        const invert = -1;
        this.ts.translate.x = this.previousPosition.x + invert * (-x + this.startPoint.x);
        this.ts.translate.y = this.previousPosition.y + invert * (-y + this.startPoint.y);
        this.ts.translate = this.restrictXY(this.ts.translate);
        this.setTransform();
        this.velocity = {
          x: this.ts.translate.x - oldX,
          y: this.ts.translate.y - oldY
        };
        if (Math.abs(this.previousPosition.x - this.ts.translate.x) > this.threshold || Math.abs(this.previousPosition.y - this.ts.translate.x) > this.threshold) {
          this.dragged = true;
          if (document.body)
            document.body.setAttribute("ytme-hide", "");
          const currentVideo2 = document.querySelector(
            "video"
          );
          if (currentVideo2) {
            clearTimeout(this.bezelTimeout);
            if (this.isPlaying) {
              currentVideo2.onpause = null;
              currentVideo2.onpause = () => {
                if (currentVideo2.paused)
                  currentVideo2.play().then(() => {
                    if (currentVideo2.paused)
                      currentVideo2.play();
                  });
                currentVideo2.onpause = null;
                this.bezelTimeout = setTimeout(() => {
                  if (document.body)
                    document.body.removeAttribute("ytme-hide");
                }, 350);
              };
            } else {
              currentVideo2.onplay = null;
              currentVideo2.onplay = () => {
                if (!currentVideo2.paused)
                  currentVideo2.pause();
                currentVideo2.onplay = null;
                this.bezelTimeout = setTimeout(() => {
                  if (document.body)
                    document.body.removeAttribute("ytme-hide");
                }, 350);
              };
            }
          }
        }
      } else if (this.isScale && this.isTouchEvent(event) && event.touches.length === 2) {
        const firstTouch = event.touches[0];
        const secondTouch = event.touches[1];
        const dist = Math.hypot(
          firstTouch.clientX - secondTouch.clientX,
          firstTouch.clientY - secondTouch.clientY
        );
        let rec = this.targetElement.getBoundingClientRect();
        let pinchCenterX = ((firstTouch.clientX + secondTouch.clientX) / 2 - rec.left) / this.ts.scale;
        let pinchCenterY = ((firstTouch.clientY + secondTouch.clientY) / 2 - rec.top) / this.ts.scale;
        const beforeTargetSize = {
          w: Math.round(rec.width / this.ts.scale),
          h: Math.round(rec.height / this.ts.scale)
        };
        const mapDist = Math.hypot(
          beforeTargetSize.w * this.ts.scale,
          beforeTargetSize.h * this.ts.scale
        );
        const x = mapDist * dist / this.startDist;
        const scale = x / mapDist * this.startScale;
        const restrictScale = Math.min(
          Math.max(this.minScale, scale),
          this.maxScale
        );
        const factor = restrictScale - this.ts.scale;
        const m = factor > 0 ? factor / 2 : factor / 2;
        this.ts.translate.x += -(pinchCenterX * m * 2) + beforeTargetSize.w * m;
        this.ts.translate.y += -(pinchCenterY * m * 2) + beforeTargetSize.h * m;
        this.ts.translate = this.restrictXY(this.ts.translate);
        this.ts.scale = restrictScale;
        this.setTransform();
      }
      if (this.eventElement) {
        this.eventElement.ontouchmove = func;
      } else {
        this.targetElement.ontouchmove = func;
      }
    });
    __publicField(this, "onEnd", (event) => {
      const eventTarget = this.eventElement ?? this.targetElement;
      if (this.isTouchEvent(event)) {
        eventTarget.removeEventListener("touchmove", this.onMove);
        eventTarget.removeEventListener("touchend", this.onEnd);
      } else {
        eventTarget.removeEventListener("mousemove", this.onMove);
        eventTarget.removeEventListener("mouseup", this.onEnd);
        eventTarget.removeEventListener("mouseleave", this.onEnd);
      }
      cancelAnimationFrame(this.inertiaAnimationFrame);
      if (this.dragged && this.isDrag) {
        this.dragFinish();
      }
      this.dragged = false;
      this.isDrag = false;
      this.isScale = false;
    });
    __publicField(this, "onWheel", (event) => {
      const moveOn = localStorage.getItem("ytme-move");
      if (!moveOn || moveOn === "false")
        return;
      if (!this.targetElement)
        return;
      event.preventDefault();
      this.ts = this.getPosition();
      let func = this.eventElement ? this.eventElement.onwheel : this.targetElement.onwheel;
      this.targetElement.onwheel = null;
      let rec = this.targetElement.getBoundingClientRect();
      let pointerX = (event.clientX - rec.left) / this.ts.scale;
      let pointerY = (event.clientY - rec.top) / this.ts.scale;
      let delta = -event.deltaY;
      if (this.ts.scale === this.maxScale && delta > 0) {
        return;
      }
      const beforeTargetSize = {
        w: Math.round(rec.width / this.ts.scale),
        h: Math.round(rec.height / this.ts.scale)
      };
      const factor = this.factor * this.ts.scale;
      this.ts.scale = delta > 0 ? this.ts.scale + factor : this.ts.scale - factor;
      this.ts.scale = Math.min(
        Math.max(this.minScale, this.ts.scale),
        this.maxScale
      );
      let m = delta > 0 ? factor / 2 : -(factor / 2);
      if (this.ts.scale <= this.minScale && delta < 0) {
        return;
      }
      this.ts.translate.x += -pointerX * m * 2 + beforeTargetSize.w * m;
      this.ts.translate.y += -pointerY * m * 2 + beforeTargetSize.h * m;
      this.ts.translate = this.restrictXY(this.ts.translate);
      this.setTransform();
      if (this.eventElement) {
        this.eventElement.onwheel = func;
      } else {
        this.targetElement.onwheel = func;
      }
    });
  }
}
let mutationTimeout;
let stepOne = false;
let stepTwo = false;
let dragZoom = null;
let timeout;
let parentElement = null;
let currentVideo = null;
let A_BY_B = {};
let RunA_BY_B = false;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const toHHMMSS = (secondsTime) => {
  if (!Number(secondsTime) || !secondsTime)
    return "00:00";
  let sec_num = Number(secondsTime.toFixed(0));
  let hours = Math.floor(sec_num / 3600);
  let minutes = Math.floor((sec_num - hours * 3600) / 60);
  let seconds = sec_num - hours * 3600 - minutes * 60;
  let mileSeconds = secondsTime - Math.floor(secondsTime);
  return `${hours ? String(hours).padStart(2, "0") + ":" : ""}${String(
    minutes
  ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}${mileSeconds ? Math.abs(mileSeconds).toFixed(2).replace("0.", ".") : ""}`;
};
const checkYoutubeId = (url) => {
  const youtubeRegex = /(.*?)(^|\/|v=)([a-z0-9_-]{11})(.*)?/gim;
  return youtubeRegex.test(url ?? window.location.href);
};
const addExpanderClass = () => {
  return document.body.setAttribute("ytme", "");
};
const removeExpanderClass = () => {
  return document.body.removeAttribute("ytme");
};
async function waitForVideo() {
  let video = document.querySelector("video");
  while (!video) {
    await sleep(300);
    video = document.querySelector("video");
  }
}
const currentYoutubeQualities = [
  "4320p",
  "2880p",
  "2160p",
  "1440p",
  "1080p",
  "720p",
  "480p",
  "360p",
  "240p",
  "144p"
];
function checkQuality(el) {
  const qualityPRegex = /(^\d.*)p/g;
  const notQualityRegex = /\((.*[0-9])p/g;
  let textList = el.filter((value) => {
    let item = value == null ? void 0 : value.innerText.trim();
    return !notQualityRegex.test(item) && (currentYoutubeQualities.some((p) => item.includes(p)) || qualityPRegex.test(item));
  });
  return textList;
}
async function callHighQuality() {
  var _a;
  stepOne = true;
  const hqOn = localStorage.getItem("ytme-hq");
  if (hqOn !== "true")
    return;
  await waitForVideo();
  let settingsButton = (_a = document.getElementsByClassName(
    "ytp-settings-button"
  )) == null ? void 0 : _a[0];
  await sleep(300);
  if (settingsButton)
    settingsButton.click();
}
function initPosition(observer) {
  observer == null ? void 0 : observer.disconnect();
  dragZoom == null ? void 0 : dragZoom.loadTransform();
}
const removeButtons = () => {
  const ytmeBtn = document.querySelectorAll(
    ".ytme-btn"
  );
  if (ytmeBtn.length > 0)
    ytmeBtn.forEach((el) => el.remove());
};
const createTextButton = (text) => {
  const textButton = document.createElement("button");
  const textSpan = document.createElement("span");
  textButton.classList.add("ytp-button");
  textButton.classList.add("ytme-btn");
  textButton.classList.add("ytme-text-btn");
  textSpan.innerText = text;
  textButton.appendChild(textSpan);
  return {
    button: textButton,
    span: textSpan
  };
};
const createSVG = (d, appendClass) => {
  const buttonSVG = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  buttonSVG.setAttributeNS(null, "width", "100%");
  buttonSVG.setAttributeNS(null, "height", "100%");
  buttonSVG.setAttributeNS(null, "version", "1.1");
  buttonSVG.setAttributeNS(null, "viewBox", "0 0 36 36");
  const buttonPath = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  buttonPath.setAttributeNS(null, "fill", "#ffffff");
  buttonPath.setAttributeNS(null, "d", d);
  const createdButton = document.createElement("button");
  createdButton.classList.add("ytp-button");
  createdButton.classList.add("ytme-btn");
  if (appendClass)
    createdButton.classList.add(appendClass);
  buttonSVG.appendChild(buttonPath);
  createdButton.appendChild(buttonSVG);
  return createdButton;
};
const checkToggle = (storageName, el) => {
  const onStorage = localStorage.getItem(storageName);
  if (onStorage === "true") {
    el.classList.add("active");
  } else {
    el.classList.remove("active");
  }
};
const checkA_BY_B = () => {
  return typeof (A_BY_B == null ? void 0 : A_BY_B.A) === "number" && typeof (A_BY_B == null ? void 0 : A_BY_B.B) === "number" && A_BY_B.A < A_BY_B.B;
};
const onTimeUpdate = (e) => {
  const videoElement = e.currentTarget;
  if (!RunA_BY_B)
    return;
  if (typeof A_BY_B.A === "number" && typeof A_BY_B.B === "number") {
    if (videoElement.currentTime < A_BY_B.A) {
      videoElement.pause();
      videoElement.currentTime = A_BY_B.A;
      videoElement.play();
    } else if (videoElement.currentTime > A_BY_B.B) {
      videoElement.pause();
      videoElement.currentTime = A_BY_B.A;
      videoElement.play();
    }
  }
};
const optionEvents = (e) => {
  const lastTarget = e.target;
  if (lastTarget.classList.contains("ytme-inner-btn")) {
    e.stopPropagation();
    const video = document.querySelector("video");
    if (!video)
      return;
    const isA = lastTarget.classList.contains("ytme-a");
    const isB = lastTarget.classList.contains("ytme-b");
    const isToggle = lastTarget.classList.contains("ytme-toggle-a-b");
    if (isA) {
      if (!A_BY_B.A) {
        if (A_BY_B.B && video.currentTime > A_BY_B.B)
          return;
        A_BY_B.A = video.currentTime;
        lastTarget.innerText = `A: ${toHHMMSS(A_BY_B.A)}`;
      } else {
        A_BY_B.A = void 0;
        lastTarget.innerText = `A`;
      }
    }
    if (isB) {
      if (!A_BY_B.B) {
        if (A_BY_B.A && video.currentTime < A_BY_B.A)
          return;
        A_BY_B.B = video.currentTime;
        lastTarget.innerText = `B: ${toHHMMSS(A_BY_B.B)}`;
      } else {
        A_BY_B.B = void 0;
        lastTarget.innerText = `B`;
      }
    }
    if (isToggle) {
      if (checkA_BY_B()) {
        RunA_BY_B = !RunA_BY_B;
      } else {
        RunA_BY_B = false;
      }
      lastTarget.innerText = RunA_BY_B ? "on" : "off";
      if (RunA_BY_B) {
        video.addEventListener("timeupdate", onTimeUpdate);
      } else {
        video.removeEventListener("timeupdate", onTimeUpdate);
      }
    }
  }
  e.stopPropagation();
  const eventTarget = e.target;
  if (!eventTarget)
    return;
  const dataValue = eventTarget.getAttribute("data-value");
  if (!dataValue)
    return;
  if (dataValue === "rotate") {
    dragZoom.ts = dragZoom.getPosition();
    dragZoom.ts = {
      ...dragZoom.ts,
      rotate: dragZoom.toggleRotation(dragZoom.ts.rotate)
    };
    eventTarget.innerText = `Rotate: ${dragZoom.ts.rotate + "°"}`;
    dragZoom.setTransform();
  }
  if (dataValue === "hq") {
    const hqOn = localStorage.getItem("ytme-hq");
    if (!hqOn || hqOn === "false") {
      localStorage.setItem("ytme-hq", "true");
      eventTarget.classList.add("active");
    } else {
      localStorage.setItem("ytme-hq", "false");
      eventTarget.classList.remove("active");
    }
  }
  if (dataValue === "transform") {
    const moveOn = localStorage.getItem("ytme-move");
    if (!moveOn || moveOn === "false") {
      localStorage.setItem("ytme-move", "true");
      eventTarget.classList.add("active");
    } else {
      localStorage.setItem("ytme-move", "false");
      eventTarget.classList.remove("active");
    }
  }
};
const createOptions = () => {
  const optionsEl = document.createElement("div");
  optionsEl.classList.add("ytme-option-list");
  dragZoom.ts = dragZoom.getPosition();
  const moveOn = localStorage.getItem("ytme-move") === "true";
  const qualityOn = localStorage.getItem("ytme-hq") === "true";
  optionsEl.innerHTML = `
  <div class="option-nav">
  <div class="option-item noPadding" data-value="a-b"><div onclick="window.lastEvent" class="ytme-a ytme-inner-btn">A</div><div class="ytme-b ytme-inner-btn">B</div><div class="ytme-toggle-a-b ytme-inner-btn">on/off</div></div>
  <div class="option-item" data-value="rotate">Rotate: ${dragZoom.ts.rotate + "°"}</div>
  <div class="option-item${moveOn ? " active" : ""}" data-value="transform">Transform<div class="ytme-ball"></div></div>
  <div class="option-item${qualityOn ? " active" : ""}" data-value="hq">Force High Quality<div class="ytme-ball"></div></div>
    </div>
  `;
  return optionsEl;
};
const createButtons = () => {
  removeButtons();
  if (!dragZoom)
    return;
  const restoreButton = createSVG(
    "M20.673,16.932l4.276,-0c0.445,-0 0.802,-0.358 0.802,-0.803l0,-4.275c0,-0.325 -0.193,-0.619 -0.494,-0.742c-0.301,-0.124 -0.645,-0.058 -0.876,0.174l-1.389,1.389c-2.927,-2.889 -7.641,-2.879 -10.551,0.033c-2.922,2.924 -2.922,7.661 0,10.584c2.924,2.923 7.661,2.923 10.584,-0c0.417,-0.418 0.417,-1.096 -0,-1.514c-0.418,-0.417 -1.096,-0.417 -1.513,0c-2.088,2.088 -5.473,2.088 -7.561,0c-2.087,-2.088 -2.087,-5.472 0,-7.56c2.078,-2.078 5.436,-2.088 7.527,-0.033l-1.373,1.376c-0.231,0.231 -0.297,0.575 -0.173,0.876c0.123,0.301 0.417,0.495 0.741,0.495Z",
    "ytme-restore"
  );
  dragZoom.ts = dragZoom.getPosition();
  const { button: optionsBtn } = createTextButton("YT");
  const hasTransformed = dragZoom.hasTransformed();
  checkToggle("ytme-options", optionsBtn);
  optionsBtn.onclick = (e) => {
    if (optionsBtn.querySelector(".ytme-option-list")) {
      optionsBtn.classList.remove("active");
      optionsBtn.querySelector(".ytme-option-list").remove();
    } else {
      optionsBtn.classList.add("active");
      const optionsEL = createOptions();
      const controlbar = document.querySelector(".ytp-chrome-controls");
      optionsEL.style.bottom = controlbar.clientHeight + "px";
      const btnRect = optionsBtn.getBoundingClientRect();
      optionsEL.style.left = btnRect.left + "px";
      const optionChilds = [...optionsEL.children];
      optionChilds.forEach((el) => el.addEventListener("click", optionEvents));
      optionsBtn.prepend(optionsEL);
    }
  };
  if (hasTransformed) {
    restoreButton.classList.add("hide");
  }
  restoreButton.onclick = (e) => {
    e.stopPropagation();
    dragZoom.restore();
  };
  document.querySelector(".ytp-right-controls").prepend(optionsBtn);
  document.querySelector(".ytp-right-controls").prepend(restoreButton);
};
const addActiveHeader = () => {
  const Header = document.querySelector("#masthead-container");
  Header.classList.add("active");
};
const removeActiveHeader = () => {
  const Header = document.querySelector("#masthead-container");
  Header.classList.remove("active");
};
const ytmeInitial = async (observer, target, config) => {
  addExpanderClass();
  await waitForVideo();
  currentVideo = document.querySelector(
    "video:not(#video-preview-container video)"
  );
  if (!currentVideo) {
    currentVideo = document.querySelector(
      "video:not(#video-preview-container video)"
    );
  }
  if (!parentElement) {
    if (!currentVideo)
      return;
    if (!currentVideo.parentElement)
      return;
    parentElement = currentVideo.parentElement;
  }
  if (!(dragZoom instanceof DragZoom)) {
    dragZoom = new DragZoom(currentVideo, parentElement, {
      before: () => {
        observer.disconnect();
      },
      after: () => {
        const hasTransformed = dragZoom.hasTransformed();
        const restoreBtn = document.querySelector(".ytme-restore");
        if (hasTransformed) {
          if (restoreBtn)
            restoreBtn.classList.remove("hide");
        } else {
          if (restoreBtn)
            restoreBtn.classList.add("hide");
        }
        observer.observe(target, config);
      }
    });
    const Header = document.querySelector("#masthead-container");
    Header.addEventListener("mouseenter", addActiveHeader);
    currentVideo.addEventListener("mouseenter", removeActiveHeader);
    currentVideo.addEventListener("mousedown", dragZoom.on);
    parentElement.addEventListener("wheel", dragZoom.onWheel);
    createButtons();
  }
  if (!stepOne && localStorage.getItem("ytme-hq") === "true") {
    await callHighQuality();
  }
};
const restoreBind = () => {
  if (dragZoom) {
    const Header = document.querySelector("#masthead-container");
    Header == null ? void 0 : Header.removeEventListener("mouseenter", addActiveHeader);
    currentVideo == null ? void 0 : currentVideo.removeEventListener("mousedown", dragZoom.on);
    currentVideo == null ? void 0 : currentVideo.addEventListener("mouseenter", removeActiveHeader);
    parentElement == null ? void 0 : parentElement.removeEventListener("wheel", dragZoom.onWheel);
    dragZoom = null;
  }
  removeButtons();
  removeExpanderClass();
};
async function clickQualityPanel() {
  var _a;
  await sleep(100);
  const panels = (_a = document.querySelector(".ytp-panel-menu")) == null ? void 0 : _a.lastChild;
  if (panels && stepOne) {
    stepOne = false;
    stepTwo = true;
    await sleep(300);
    panels.click();
  } else {
    stepOne = false;
    let popupMenu = document.querySelector(
      ".ytp-popup.ytp-settings-menu"
    );
    if (popupMenu)
      popupMenu.style.opacity = "";
  }
}
function checkAttributes(target, attr) {
  return target.hasAttribute(attr);
}
async function clickHighQuality() {
  await sleep(100);
  stepTwo = false;
  let qualityOptions = [
    ...document.querySelectorAll(".ytp-panel-menu > .ytp-menuitem")
  ];
  if (qualityOptions.length < 1)
    return;
  qualityOptions = checkQuality(qualityOptions);
  let selection = qualityOptions[0];
  if (!selection)
    return;
  if ((selection == null ? void 0 : selection.attributes["aria-checked"]) === void 0) {
    selection.click();
  } else {
    let settingsButton = document.getElementsByClassName(
      "ytp-settings-button"
    )[0];
    settingsButton.click();
  }
}
function main() {
  const config = { attributes: true, childList: true, subtree: true };
  const target = document.body;
  if (!target)
    return;
  let observer = new MutationObserver(function(mutations, observer2) {
    mutations.forEach(async function(mutation) {
      const mutationTarget = mutation.target;
      if (mutationTarget.classList.contains("ytp-panel-menu") && stepOne) {
        if (mutationTimeout)
          clearTimeout(mutationTimeout);
        mutationTimeout = setTimeout(async () => {
          await clickQualityPanel();
        }, 300);
      }
      if (mutationTarget.classList.contains("ytp-panel-menu") && stepTwo) {
        if (mutationTimeout)
          clearTimeout(mutationTimeout);
        mutationTimeout = setTimeout(async () => {
          await clickHighQuality();
        }, 300);
      }
      if (mutation.target.nodeName.toLowerCase() === "ytd-watch-flexy") {
        const el = mutation.target;
        const isTheater = () => checkAttributes(el, "theater") && checkYoutubeId(mutation.target.baseURI);
        const isFullScreen = () => checkAttributes(el, "fullscreen") && checkYoutubeId(mutation.target.baseURI);
        const isHidden = () => checkAttributes(el, "hidden");
        const isMain = () => el.hasAttribute("role") && el.getAttribute("role") === "main";
        if (mutation.attributeName === "video-id" && el.getAttribute("video-id")) {
          if (!stepOne && localStorage.getItem("ytme-hq") === "true") {
            await callHighQuality();
          }
        }
        if (mutation.attributeName === "hidden" || mutation.attributeName === "role") {
          if (isHidden() && !isMain()) {
            restoreBind();
          } else if (isTheater()) {
            ytmeInitial(observer2, target, config);
          }
        }
        if (mutation.attributeName === "theater") {
          if (isTheater()) {
            ytmeInitial(observer2, target, config);
          } else {
            restoreBind();
          }
        } else if (mutation.attributeName === "fullscreen") {
          if (isFullScreen()) {
            ytmeInitial(observer2, target, config);
          } else if (!isTheater()) {
            restoreBind();
          }
        }
      }
      if (mutation.type === "attributes") {
        if (mutation.target.nodeName === "VIDEO" && mutation.attributeName !== "tabindex" && checkYoutubeId(mutation.target.baseURI)) {
          if (timeout) {
            clearTimeout(timeout);
          }
          timeout = setTimeout(async () => {
            initPosition(observer2);
            observer2.observe(target, config);
          }, 600);
        }
      }
    });
  });
  observer.observe(target, config);
}
main();
