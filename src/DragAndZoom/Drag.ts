import ControlPosition from "./ControlPosition"

class Drag extends ControlPosition {
  inertiaAnimationFrame = -1
  isDrag = false
  isScale = false
  dragged = false
  threshold = 1
  startPoint = {
    x: 0,
    y: 0,
  }
  previousPosition = {
    x: 0,
    y: 0,
  }
  private maximumInertia = 40
  velocity = {
    x: 0,
    y: 0,
  }
  private deceleration = 0.9
  startDist = 0
  startScale = 1
  private capSpeed = (value: number) => {
    let res = 0
    if (Math.abs(value) > this.maximumInertia) {
      res = this.maximumInertia
      res *= value < 0 ? -1 : 1
      return res
    }
    return value
  }
  private updateInertia = () => {
    if (!this.targetElement) return
    this.velocity.x = this.velocity.x * this.deceleration
    this.velocity.y = this.velocity.y * this.deceleration

    this.velocity.x = Math.round(this.velocity.x * 10) / 10
    this.velocity.y = Math.round(this.velocity.y * 10) / 10

    this.ts.translate.x = Math.round(this.ts.translate.x + this.velocity.x)
    this.ts.translate.y = Math.round(this.ts.translate.y + this.velocity.y)
    this.setTransform()
    if (
      Math.floor(Math.abs(this.velocity.x)) !== 0 ||
      Math.floor(Math.abs(this.velocity.y)) !== 0
    ) {
      this.inertiaAnimationFrame = requestAnimationFrame(this.updateInertia)
    }
  }
  dragFinish = () => {
    this.velocity = {
      x: this.capSpeed(this.restrictXY(this.velocity).x),
      y: this.capSpeed(this.restrictXY(this.velocity).y),
    }
    if (this.velocity.x !== 0 || this.velocity.y !== 0) {
      this.inertiaAnimationFrame = requestAnimationFrame(this.updateInertia)
    }
  }
}
export default Drag
