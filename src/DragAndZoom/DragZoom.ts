import Drag from "./Drag";

const degrees = [0, 90, 180, 270] as const;
const toggleDegrees = (currentDegreeIndex: number): typeof degrees[number] => {
  const max = degrees.length - 1;
  if (currentDegreeIndex + 1 > max) return 0;
  return degrees[currentDegreeIndex + 1];
};
class DragZoom extends Drag {
  isPlaying: boolean = false;
  bezelTimeout: NodeJS.Timeout;
  key = (event: KeyboardEvent) => {
    if (event.code === "KeyR") {
      this.ts = this.getPosition();
      const currentDegree = this.ts.rotate;
      const currentDegreeIndex = degrees.findIndex(
        (item) => item === currentDegree
      );
      this.ts = { ...this.ts, rotate: toggleDegrees(currentDegreeIndex) };
      this.setTransform();
    }
  };
  restore = () => {
    this.ts = {
      rotate: 0,
      scale: 1,
      translate: {
        x: 0,
        y: 0,
      },
    };
    this.setTransform();
  };
  on = (event: any) => {
    const moveOn = localStorage.getItem("ytme-move");
    if (!moveOn) return;
    if (moveOn === "false") return;
    const currentVideo = document.querySelector("video") as HTMLVideoElement;
    if (currentVideo) {
      this.isPlaying = !currentVideo.paused;
    }

    if (event.button) {
      if (event.preventDefault != undefined) event.preventDefault();
      if (event.stopPropagation != undefined) event.stopPropagation();
      this.restore();
      event.cancelBubble = false;
      return false;
    }
    this.ts = this.getPosition();
    if (this.isTouchEvent(event) && event.touches.length === 2) {
      this.isDrag = false;
      this.isScale = true;
      // 터치 시작시 두손가락 거리
      this.startDist = Math.hypot(
        event.touches[0].pageX - event.touches[1].pageX,
        event.touches[0].pageY - event.touches[1].pageY
      );
      // 터치 시작시 스케일
      this.startScale = this.ts.scale;
    } else {
      cancelAnimationFrame(this.inertiaAnimationFrame);
      this.isDrag = true;
      this.isScale = false;
      this.startPoint = {
        x: this.isTouchEvent(event) ? event.touches[0].pageX : event.pageX,
        y: this.isTouchEvent(event) ? event.touches[0].pageY : event.pageY,
      };
      this.previousPosition = {
        x: this.ts.translate.x,
        y: this.ts.translate.y,
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
  };
  private isTouchEvent = (event: any): event is TouchEvent => {
    return "touches" in event;
  };
  private onMove = (event: TouchEvent | MouseEvent) => {
    if (!this.targetElement) return;
    // 중첩 실행 문제 (성능) 해결 :: 굳이 할 필요없음.
    let func = this.eventElement
      ? this.eventElement.ontouchmove
      : this.targetElement.ontouchmove;
    this.targetElement.ontouchmove = null;

    // 드래그 이벤트 (현재 없음)
    if (
      this.isDrag &&
      ((this.isTouchEvent(event) && event.touches.length === 1) ||
        !this.isTouchEvent(event))
    ) {
      const x = this.isTouchEvent(event) ? event.touches[0].pageX : event.pageX;
      const y = this.isTouchEvent(event) ? event.touches[0].pageY : event.pageY;
      const oldX = this.ts.translate.x;
      const oldY = this.ts.translate.y;
      const isInvert = false;
      const invert = isInvert ? 1 : -1;

      this.ts.translate.x =
        this.previousPosition.x + invert * (-x + this.startPoint.x);
      this.ts.translate.y =
        this.previousPosition.y + invert * (-y + this.startPoint.y);
      this.ts.translate = this.restrictXY(this.ts.translate);
      this.setTransform();

      this.velocity = {
        x: this.ts.translate.x - oldX,
        y: this.ts.translate.y - oldY,
      };
      if (
        Math.abs(this.previousPosition.x - this.ts.translate.x) >
          this.threshold ||
        Math.abs(this.previousPosition.y - this.ts.translate.x) > this.threshold
      ) {
        this.dragged = true;
        if (document.body) document.body.setAttribute("ytme-hide", "");
        const currentVideo = document.querySelector(
          "video"
        ) as HTMLVideoElement;
        if (currentVideo) {
          clearTimeout(this.bezelTimeout);
          if (this.isPlaying) {
            currentVideo.onpause = null;
            currentVideo.onpause = () => {
              if (currentVideo.paused)
                currentVideo.play().then(() => {
                  if (currentVideo.paused) currentVideo.play();
                });
              currentVideo.onpause = null;
              this.bezelTimeout = setTimeout(() => {
                if (document.body) document.body.removeAttribute("ytme-hide");
              }, 350);
            };
          } else {
            currentVideo.onplay = null;
            currentVideo.onplay = () => {
              if (!currentVideo.paused) currentVideo.pause();
              currentVideo.onplay = null;
              this.bezelTimeout = setTimeout(() => {
                if (document.body) document.body.removeAttribute("ytme-hide");
              }, 350);
            };
          }
        }
      }
      // 핀치 이벤트
    } else if (
      this.isScale &&
      this.isTouchEvent(event) &&
      event.touches.length === 2
    ) {
      const firstTouch = event.touches[0];
      const secondTouch = event.touches[1];
      // 늘어난 두 손가락간 거리
      const dist = Math.hypot(
        firstTouch.clientX - secondTouch.clientX,
        firstTouch.clientY - secondTouch.clientY
      );
      // 대상의 현재 offset 값을 얻기 위해
      let rec = this.targetElement.getBoundingClientRect();
      // 두 손가락의 중앙값을 구합니다.
      let pinchCenterX =
        ((firstTouch.clientX + secondTouch.clientX) / 2 - rec.left) /
        this.ts.scale;
      let pinchCenterY =
        ((firstTouch.clientY + secondTouch.clientY) / 2 - rec.top) /
        this.ts.scale;

      // 변경전 실제 길이값, ( 회전할 경우를 width,height값의 기준이 변경되므로 offsetWidth를 쓰지않는다.)
      const beforeTargetSize = {
        w: Math.round(rec.width / this.ts.scale),
        h: Math.round(rec.height / this.ts.scale),
      };
      // 변경전의 대각선 길이 값
      const mapDist = Math.hypot(
        beforeTargetSize.w * this.ts.scale,
        beforeTargetSize.h * this.ts.scale
      );

      // 변경되는 크기의 대각선 길이값 x값을 구합니다.
      const x = (mapDist * dist) / this.startDist;
      // 스케일로 변환 * 이전 스케일
      const scale = (x / mapDist) * this.startScale;
      // 위 두줄은 ((mapDist * dist) / this.startDist / mapDist) * this.startScale 와 같다

      // 최대 최소값
      const restrictScale = Math.min(
        Math.max(this.minScale, scale),
        this.maxScale
      );
      // 증가/감소분
      const factor = restrictScale - this.ts.scale;
      // 증가/감소 여부와 중심축 부터 증감하기 위해 미리  2로 나눈다
      const m = factor > 0 ? factor / 2 : factor / 2;

      // 이동할 실제 좌표값을 구합니다. 증가/감소분분 만큼을 곱한후 현재 값에 더함
      this.ts.translate.x += -(pinchCenterX * m * 2) + beforeTargetSize.w * m;
      this.ts.translate.y += -(pinchCenterY * m * 2) + beforeTargetSize.h * m;

      this.ts.translate = this.restrictXY(this.ts.translate);
      // 스케일 업데이트
      this.ts.scale = restrictScale;
      // 좌표 업데이트
      this.setTransform();
    }

    // 중첩 실행 문제 (성능) 해결 :: 굳이 할 필요없음.
    if (this.eventElement) {
      this.eventElement.ontouchmove = func;
    } else {
      this.targetElement.ontouchmove = func;
    }
  };
  private onEnd = (event: TouchEvent | MouseEvent) => {
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
  };
  onWheel = (event: WheelEvent) => {
    const moveOn = localStorage.getItem("ytme-move");
    if (!moveOn || moveOn === "false") return;
    if (!this.targetElement) return;
    event.preventDefault();
    this.ts = this.getPosition();

    let func = this.eventElement
      ? this.eventElement.onwheel
      : this.targetElement.onwheel;
    this.targetElement.onwheel = null;

    let rec = this.targetElement.getBoundingClientRect();
    let pointerX = (event.clientX - rec.left) / this.ts.scale;
    let pointerY = (event.clientY - rec.top) / this.ts.scale;

    let delta = -event.deltaY;
    if (this.ts.scale === this.maxScale && delta > 0) {
      return;
    }
    // factor를 지정 안하고 delta값 만큼 키운 후 factor를 구하는 경우
    // const mapSize = this.targetElement.offsetWidth * this.ts.scale
    // const nextSize = mapSize + delta
    // const scale = (nextSize / mapSize) * this.ts.scale
    // const restrictScale = Math.min(
    //   Math.max(this.minScale, scale),
    //   this.maxScale
    // )
    // const factor = restrictScale - this.ts.scale
    // const m = factor > 0 ? factor / 2 : factor / 2
    // this.ts.scale = restrictScale

    const beforeTargetSize = {
      w: Math.round(rec.width / this.ts.scale),
      h: Math.round(rec.height / this.ts.scale),
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
  };
}
export default DragZoom;
