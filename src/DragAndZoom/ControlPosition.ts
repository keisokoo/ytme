export type XY = {
  x: number
  y: number
}
export type translateValues = {
  scale: number
  rotate: number
  translate: XY
}
export const filterName = ["contrast", "saturate", "brightness"]
export type FilterName = typeof filterName[number]
export const isFilterName = (value: string): value is FilterName => {
  return filterName.some((item) => item === value)
}
type FilterValueType = {
  contrast: number
  saturate: number
  brightness: number
}
type LoopTimeType = { start: number | null; end: number | null }
class ControlPosition {
  factor = 0.05
  minScale = 0.1
  maxScale = 10
  ts = {
    scale: 1,
    rotate: 0,
    translate: {
      x: 0,
      y: 0,
    },
  }
  filter = {
    contrast: 1,
    saturate: 1,
    brightness: 1,
  } as { [key in FilterName]: number } & FilterValueType
  loopTime: LoopTimeType = { start: null, end: null }
  restrictPosition?: (current: XY, targetEl: DOMRect) => XY
  public before?: () => void
  public after?: () => void
  constructor(
    public targetElement: HTMLElement,
    public eventElement: HTMLElement,
    configs?: {
      before?: () => void
      after?: () => void
      factor?: number
      minScale?: number
      maxScale?: number
      restrictPosition?: (current: XY, targetEl: DOMRect) => XY
    }
  ) {
    if (configs?.factor) this.factor = configs.factor
    if (configs?.minScale) this.minScale = configs.minScale
    if (configs?.maxScale) this.maxScale = configs.maxScale
    if (configs?.before) this.before = configs.before
    if (configs?.after) this.after = configs.after
    if (configs?.restrictPosition)
      this.restrictPosition = configs.restrictPosition
  }
  restrictXY = (currentPosition: { x: number; y: number }) => {
    let { x, y } = currentPosition
    if (!this.targetElement) return { x, y }
    if (!this.restrictPosition) {
      return { x, y }
    }
    const imageBound = this.targetElement.getBoundingClientRect()
    return this.restrictPosition(currentPosition, imageBound)
  }
  private decompose_2d_matrix = (mat: DOMMatrix): translateValues => {
    const { a, b, c, d, e, f } = mat

    let delta = a * d - b * c

    let result = {
      translation: [e, f],
      deg: 0,
      rotation: 0,
      scale: [0, 0],
      skew: [0, 0],
    }
    if (a !== 0 || b !== 0) {
      let r = Math.sqrt(a * a + b * b)
      result.rotation = b > 0 ? Math.acos(a / r) : -Math.acos(a / r)
      result.scale = [r, delta / r]
      result.skew = [Math.atan((a * c + b * d) / (r * r)), 0]
    } else if (c !== 0 || d !== 0) {
      let s = Math.sqrt(c * c + d * d)
      result.rotation =
        Math.PI / 2 - (d > 0 ? Math.acos(-c / s) : -Math.acos(c / s))
      result.scale = [delta / s, s]
      result.skew = [0, Math.atan((a * c + b * d) / (s * s))]
    } else {
      // a = b = c = d = 0 이므로 업데이트 하지 않는다.
    }
    if (Math.abs(result.rotation) === 0) result.rotation = 0
    const degree = result.rotation * (180 / Math.PI)
    result.deg = degree < 0 ? degree + 360 : degree

    return {
      scale: result.scale[0],
      rotate: result.deg,
      translate: {
        x: result.translation[0],
        y: result.translation[1],
      },
    }
  }
  private isTranslateValues = (value: any): value is translateValues => {
    return (
      value !== undefined &&
      "translate" in value &&
      "rotate" in value &&
      "scale" in value
    )
  }
  private isFilter = (value: any): value is FilterValueType => {
    return (
      value !== undefined &&
      "contrast" in value &&
      "brightness" in value &&
      "saturate" in value
    )
  }
  getPosition = (el?: HTMLElement) => {
    const matrix = new WebKitCSSMatrix(
      window.getComputedStyle(el ?? this.targetElement).transform
    )
    return this.decompose_2d_matrix(matrix)
  }
  updatePosition = (
    value: translateValues | ((value: translateValues) => translateValues)
  ) => {
    if (this.isTranslateValues(value)) {
      this.ts = value
    } else {
      this.ts = value(this.getPosition())
    }
    this.setTransform()
  }
  loadTransform = () => {
    const tsString = localStorage.getItem("ytf-transform")
    const filterString = localStorage.getItem("ytf-filter")
    if (tsString) {
      const parse = JSON.parse(tsString)
      if (this.isTranslateValues(parse)) {
        this.ts = parse
        this.setTransform()
      }
    }
    if (filterString) {
      const parse = JSON.parse(filterString)
      if (this.isFilter(parse)) {
        this.filter = parse
        this.setFilter()
      }
    }
  }
  setTransform = () => {
    if (this.before) this.before()
    localStorage.setItem("ytf-transform", JSON.stringify(this.ts))
    this.targetElement.style.transform = `translate(${this.ts.translate.x}px,${this.ts.translate.y}px) scale(${this.ts.scale}) rotate(${this.ts.rotate}deg)`
    if (this.after) this.after()
  }
  setFilter = () => {
    if (this.before) this.before()
    localStorage.setItem("ytf-filter", JSON.stringify(this.filter))
    Object.keys(this.filter).forEach((keyName) => {
      const spanTarget = document.querySelector(
        `.ytf-${keyName}`
      ) as HTMLSpanElement
      if (spanTarget) {
        spanTarget.textContent = String(
          Math.floor(this.filter[keyName] * 100) / 100
        )
      }
    })
    this.targetElement.style.filter = `contrast(${this.filter.contrast}) saturate(${this.filter.saturate}) brightness(${this.filter.brightness})`
    if (this.after) this.after()
  }
  toggleRotation = (value: number) => {
    value = Math.abs(value)
    return value === 0 ? 90 : value === 90 ? 180 : value === 180 ? 270 : 0
  }
}
export default ControlPosition
