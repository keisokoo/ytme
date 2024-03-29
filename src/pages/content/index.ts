import DragZoom from '@src/DragAndZoom/DragZoom'

let theaterTimeout: NodeJS.Timeout
let mutationTimeout: NodeJS.Timeout
let stepOne = false
let stepTwo = false
let dragZoom: DragZoom | null = null
let pageCheckTimeout: NodeJS.Timeout
let timeout: NodeJS.Timeout
let parentElement: HTMLElement | null = null
let currentVideo: HTMLVideoElement | null = null
let A_BY_B: {
  A?: number
  B?: number
} = {}
let RunA_BY_B: boolean = false
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const toHHMMSS = (secondsTime: number) => {
  if (!Number(secondsTime) || !secondsTime) return '00:00'
  let sec_num = Number(secondsTime.toFixed(0))
  let hours: number = Math.floor(sec_num / 3600)
  let minutes: number = Math.floor((sec_num - hours * 3600) / 60)
  let seconds: number = sec_num - hours * 3600 - minutes * 60
  let mileSeconds: number = secondsTime - Math.floor(secondsTime)
  return `${hours ? String(hours).padStart(2, '0') + ':' : ''}${String(
    minutes
  ).padStart(2, '0')}:${String(seconds).padStart(2, '0')}${
    mileSeconds ? Math.abs(mileSeconds).toFixed(2).replace('0.', '.') : ''
  }`
}

const checkYoutubeId = (url?: string) => {
  const youtubeRegex = /(.*?)(^|\/|v=)([a-z0-9_-]{11})(.*)?/gim
  return youtubeRegex.test(url ?? window.location.href)
}
const addExpanderClass = () => {
  return document.body.setAttribute('ytme', '')
}
const removeExpanderClass = () => {
  return document.body.removeAttribute('ytme')
}

const degrees = ['0', '90', '180', '270'] as const
const toggleDegrees = (
  currentDegreeIndex: number
): (typeof degrees)[number] => {
  const max = degrees.length - 1
  if (currentDegreeIndex + 1 > max) return '0'
  return degrees[currentDegreeIndex + 1]
}
const rotateKeyBinding = (e: KeyboardEvent) => {
  if (e.code === 'KeyR') {
    const currentDegree = document.body.getAttribute('ytme-degree')
      ? document.body.getAttribute('ytme-degree')
      : '0'
    const currentDegreeIndex = degrees.findIndex(
      (item) => item === currentDegree
    )
    document.body.setAttribute('ytme-degree', toggleDegrees(currentDegreeIndex))
  }
}
async function waitForVideo() {
  let video = document.querySelector('video')
  while (!video) {
    await sleep(300)
    video = document.querySelector('video')
  }
}
const currentYoutubeQualities = [
  '4320p',
  '2880p',
  '2160p',
  '1440p',
  '1080p',
  '720p',
  '480p',
  '360p',
  '240p',
  '144p',
]
function checkQuality(el: HTMLElement[]) {
  const qualityPRegex = /(^\d.*)p/g
  const notQualityRegex = /\((.*[0-9])p/g
  let textList = el.filter((value) => {
    let item = value?.innerText.trim()
    return (
      !notQualityRegex.test(item) &&
      (currentYoutubeQualities.some((p) => item.includes(p)) ||
        qualityPRegex.test(item))
    )
  })
  return textList
}
async function callHighQuality() {
  stepOne = true
  const hqOn = localStorage.getItem('ytme-hq')
  if (hqOn !== 'true') return
  await waitForVideo()
  let settingsButton = document.getElementsByClassName(
    'ytp-settings-button'
  )?.[0] as HTMLButtonElement
  await sleep(300)
  if (settingsButton) settingsButton.click()
}
function initPosition(observer?: MutationObserver) {
  observer?.disconnect()
  dragZoom?.loadTransform()
}
const removeButtons = () => {
  const ytmeBtn = document.querySelectorAll(
    '.ytme-btn'
  ) as NodeListOf<HTMLElement>
  if (ytmeBtn.length > 0) ytmeBtn.forEach((el) => el.remove())
}
const createTextButton = (text: string) => {
  const textButton = document.createElement('button')
  const textSpan = document.createElement('span')
  textButton.classList.add('ytp-button')
  textButton.classList.add('ytme-btn')
  textButton.classList.add('ytme-text-btn')
  textSpan.innerText = text
  textButton.appendChild(textSpan)
  return {
    button: textButton,
    span: textSpan,
  }
}
const createSVG = (d: string, appendClass?: string) => {
  const buttonSVG = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg'
  )
  buttonSVG.setAttributeNS(null, 'width', '100%')
  buttonSVG.setAttributeNS(null, 'height', '100%')
  buttonSVG.setAttributeNS(null, 'version', '1.1')
  buttonSVG.setAttributeNS(null, 'viewBox', '0 0 36 36')
  const buttonPath = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path'
  )
  buttonPath.setAttributeNS(null, 'fill', '#ffffff')
  buttonPath.setAttributeNS(null, 'd', d)
  const createdButton = document.createElement('button')
  createdButton.classList.add('ytp-button')
  createdButton.classList.add('ytme-btn')
  if (appendClass) createdButton.classList.add(appendClass)
  buttonSVG.appendChild(buttonPath)
  createdButton.appendChild(buttonSVG)
  return createdButton
}
const checkToggle = (storageName: string, el: HTMLElement) => {
  const onStorage = localStorage.getItem(storageName)
  if (onStorage === 'true') {
    el.classList.add('active')
  } else {
    el.classList.remove('active')
  }
}
const checkA_BY_B = () => {
  return (
    typeof A_BY_B?.A === 'number' &&
    typeof A_BY_B?.B === 'number' &&
    A_BY_B.A < A_BY_B.B
  )
}
const onTimeUpdate = (e: Event) => {
  const videoElement = e.currentTarget as HTMLVideoElement
  if (!RunA_BY_B) return
  if (typeof A_BY_B.A === 'number' && typeof A_BY_B.B === 'number') {
    if (videoElement.currentTime < A_BY_B.A) {
      videoElement.pause()
      videoElement.currentTime = A_BY_B.A
      videoElement.play()
    } else if (videoElement.currentTime > A_BY_B.B) {
      videoElement.pause()
      videoElement.currentTime = A_BY_B.A
      videoElement.play()
    }
  }
}
const optionEvents = (e: Event) => {
  const lastTarget = e.target as HTMLElement
  if (lastTarget.classList.contains('ytme-inner-btn')) {
    e.stopPropagation()
    const video = document.querySelector('video')
    if (!video) return
    const isA = lastTarget.classList.contains('ytme-a')
    const isB = lastTarget.classList.contains('ytme-b')
    const isToggle = lastTarget.classList.contains('ytme-toggle-a-b')
    if (isA) {
      if (!A_BY_B.A) {
        if (A_BY_B.B && video.currentTime > A_BY_B.B) return
        A_BY_B.A = video.currentTime
        lastTarget.innerText = `A: ${toHHMMSS(A_BY_B.A)}`
      } else {
        A_BY_B.A = undefined
        lastTarget.innerText = `A`
      }
    }
    if (isB) {
      if (!A_BY_B.B) {
        if (A_BY_B.A && video.currentTime < A_BY_B.A) return
        A_BY_B.B = video.currentTime
        lastTarget.innerText = `B: ${toHHMMSS(A_BY_B.B)}`
      } else {
        A_BY_B.B = undefined
        lastTarget.innerText = `B`
      }
    }
    if (isToggle) {
      if (checkA_BY_B()) {
        RunA_BY_B = !RunA_BY_B
      } else {
        RunA_BY_B = false
      }
      lastTarget.innerText = RunA_BY_B ? 'on' : 'off'
      if (RunA_BY_B) {
        video.addEventListener('timeupdate', onTimeUpdate)
      } else {
        video.removeEventListener('timeupdate', onTimeUpdate)
      }
    }
  }
  e.stopPropagation()
  const eventTarget = e.target as HTMLElement
  if (!eventTarget) return
  const dataValue = eventTarget.getAttribute('data-value')
  if (!dataValue) return
  if (dataValue === 'rotate') {
    dragZoom.ts = dragZoom.getPosition()
    dragZoom.ts = {
      ...dragZoom.ts,
      rotate: dragZoom.toggleRotation(dragZoom.ts.rotate),
    }
    eventTarget.innerText = `Rotate: ${dragZoom.ts.rotate + '°'}`
    dragZoom.setTransform()
  }
  if (dataValue === 'hq') {
    const hqOn = localStorage.getItem('ytme-hq')
    if (!hqOn || hqOn === 'false') {
      localStorage.setItem('ytme-hq', 'true')
      eventTarget.classList.add('active')
    } else {
      localStorage.setItem('ytme-hq', 'false')
      eventTarget.classList.remove('active')
    }
  }
  if (dataValue === 'transform') {
    const moveOn = localStorage.getItem('ytme-move')
    if (!moveOn || moveOn === 'false') {
      localStorage.setItem('ytme-move', 'true')
      eventTarget.classList.add('active')
    } else {
      localStorage.setItem('ytme-move', 'false')
      eventTarget.classList.remove('active')
    }
  }
}
const createOptions = () => {
  const optionsEl = document.createElement('div')
  optionsEl.classList.add('ytme-option-list')
  dragZoom.ts = dragZoom.getPosition()
  const moveOn = localStorage.getItem('ytme-move') === 'true'
  const qualityOn = localStorage.getItem('ytme-hq') === 'true'
  optionsEl.innerHTML = `
  <div class="option-nav">
  <div class="option-item noPadding ytme-column" data-value="a-b">
    <div class="ytme-inner-btn noHover">Repeat</div>
    <div class="ytme-row ytme-group"><div class="ytme-a ytme-inner-btn">A</div><div class="ytme-b ytme-inner-btn">B</div><div class="ytme-toggle-a-b ytme-inner-btn">on/off</div></div>
  </div>
  <div class="option-item" data-value="rotate">Rotate: ${
    dragZoom.ts.rotate + '°'
  }</div>
  <div class="option-item${
    moveOn ? ' active' : ''
  }" data-value="transform">Transform<div class="ytme-ball"></div></div>
  <div class="option-item${
    qualityOn ? ' active' : ''
  }" data-value="hq">Force High Quality<div class="ytme-ball"></div></div>
    </div>
  `
  return optionsEl
}
const createButtons = () => {
  removeButtons()
  if (!dragZoom) return
  const restoreButton = createSVG(
    'M20.673,16.932l4.276,-0c0.445,-0 0.802,-0.358 0.802,-0.803l0,-4.275c0,-0.325 -0.193,-0.619 -0.494,-0.742c-0.301,-0.124 -0.645,-0.058 -0.876,0.174l-1.389,1.389c-2.927,-2.889 -7.641,-2.879 -10.551,0.033c-2.922,2.924 -2.922,7.661 0,10.584c2.924,2.923 7.661,2.923 10.584,-0c0.417,-0.418 0.417,-1.096 -0,-1.514c-0.418,-0.417 -1.096,-0.417 -1.513,0c-2.088,2.088 -5.473,2.088 -7.561,0c-2.087,-2.088 -2.087,-5.472 0,-7.56c2.078,-2.078 5.436,-2.088 7.527,-0.033l-1.373,1.376c-0.231,0.231 -0.297,0.575 -0.173,0.876c0.123,0.301 0.417,0.495 0.741,0.495Z',
    'ytme-restore'
  )
  dragZoom.ts = dragZoom.getPosition()
  const { button: optionsBtn } = createTextButton('YT')
  const hasTransformed = dragZoom.hasTransformed()
  checkToggle('ytme-options', optionsBtn)
  optionsBtn.onclick = (e) => {
    if (optionsBtn.querySelector('.ytme-option-list')) {
      optionsBtn.classList.remove('active')
      optionsBtn.querySelector('.ytme-option-list').remove()
    } else {
      optionsBtn.classList.add('active')
      const optionsEL = createOptions()
      const controlBar = document.querySelector('.ytp-chrome-controls')
      optionsEL.style.bottom = controlBar.clientHeight + 8 + 'px'
      const btnRect = optionsBtn.getBoundingClientRect()
      optionsEL.style.left = btnRect.left - 16 + 'px'
      const optionChild = [...optionsEL.children]
      optionChild.forEach((el) => el.addEventListener('click', optionEvents))
      optionsBtn?.prepend(optionsEL)
    }
  }
  if (hasTransformed) {
    restoreButton.classList.add('hide')
  }
  restoreButton.onclick = (e) => {
    e.stopPropagation()
    const rotateElement = document.querySelector(
      '.option-item[data-value="rotate"]'
    ) as HTMLElement
    if (rotateElement) rotateElement.innerText = `Rotate: ${0 + '°'}`
    dragZoom.restore()
  }

  document.querySelector('.ytp-right-controls')?.prepend(optionsBtn)
  document.querySelector('.ytp-right-controls')?.prepend(restoreButton)
}
const addActiveHeader = () => {
  const Header = document.querySelector('#masthead-container') as HTMLElement
  Header.classList.add('active')
}
const removeActiveHeader = () => {
  const Header = document.querySelector('#masthead-container') as HTMLElement
  Header.classList.remove('active')
}
const ytmeInitial = async (
  observer: MutationObserver,
  target: Element,
  config: object
) => {
  addExpanderClass()
  await waitForVideo()
  currentVideo = document.querySelector(
    'video:not(#video-preview-container video)'
  ) as HTMLVideoElement
  if (!currentVideo) {
    currentVideo = document.querySelector(
      'video:not(#video-preview-container video)'
    ) as HTMLVideoElement
  }
  if (!parentElement) {
    if (!currentVideo) return
    if (!currentVideo.parentElement) return
    parentElement = currentVideo.parentElement! as HTMLElement
  }
  if (!(dragZoom instanceof DragZoom)) {
    dragZoom = new DragZoom(currentVideo, parentElement, {
      before: () => {
        observer.disconnect()
      },
      after: () => {
        const hasTransformed = dragZoom.hasTransformed()
        const restoreBtn = document.querySelector('.ytme-restore')
        if (hasTransformed) {
          if (restoreBtn) restoreBtn.classList.remove('hide')
        } else {
          if (restoreBtn) restoreBtn.classList.add('hide')
        }
        observer.observe(target, config)
      },
    })
    const Header = document.querySelector('#masthead-container') as HTMLElement
    window.addEventListener('blur', (e) => {
      removeActiveHeader()
    })
    Header.addEventListener('mouseenter', addActiveHeader)
    document
      .querySelector('.ytp-overlay')
      ?.addEventListener('mouseenter', () => {
        removeActiveHeader()
      })
    currentVideo.addEventListener('mouseenter', (e) => {
      removeActiveHeader()
    })
    currentVideo.addEventListener('mousedown', dragZoom.on)
    parentElement.addEventListener('wheel', dragZoom.onWheel)
    createButtons()
  }
  if (!stepOne && localStorage.getItem('ytme-hq') === 'true') {
    await callHighQuality()
  }
}
const restoreBind = () => {
  if (dragZoom) {
    const Header = document.querySelector('#masthead-container') as HTMLElement
    Header?.removeEventListener('mouseenter', addActiveHeader)
    currentVideo?.removeEventListener('mousedown', dragZoom.on)
    currentVideo?.addEventListener('mouseenter', removeActiveHeader)
    parentElement?.removeEventListener('wheel', dragZoom.onWheel)
    dragZoom = null
  }
  removeButtons()
  removeExpanderClass()
}

async function clickQualityPanel() {
  await sleep(100)
  const panels = document.querySelector('.ytp-panel-menu')
    ?.lastChild as HTMLElement
  if (panels && stepOne) {
    stepOne = false
    stepTwo = true
    await sleep(300)
    panels.click()
  } else {
    stepOne = false
    let popupMenu = document.querySelector(
      '.ytp-popup.ytp-settings-menu'
    ) as HTMLElement
    if (popupMenu) popupMenu.style.opacity = ''
  }
}
function checkAttributes(target: Element, attr: string) {
  return target.hasAttribute(attr)
}
async function clickHighQuality() {
  await sleep(100)
  stepTwo = false
  let qualityOptions = [
    ...document.querySelectorAll('.ytp-panel-menu > .ytp-menuitem'),
  ] as HTMLElement[]
  if (qualityOptions.length < 1) return
  qualityOptions = checkQuality(qualityOptions)

  let selection = qualityOptions[0]
  if (!selection) return
  if (selection?.attributes['aria-checked'] === undefined) {
    selection.click()
  } else {
    let settingsButton = document.getElementsByClassName(
      'ytp-settings-button'
    )[0] as HTMLButtonElement
    settingsButton.click()
  }
}
function main() {
  const config = { attributes: true, childList: true, subtree: true }
  const target = document.body

  if (!target) return

  // 감시자 인스턴스 만들기
  let observer = new MutationObserver(function (mutations, observer) {
    mutations.forEach(async function (mutation) {
      const mutationTarget = mutation.target as HTMLElement
      if (mutationTarget.classList.contains('ytp-panel-menu') && stepOne) {
        if (mutationTimeout) clearTimeout(mutationTimeout)
        mutationTimeout = setTimeout(async () => {
          await clickQualityPanel()
        }, 300)
      }
      if (mutationTarget.classList.contains('ytp-panel-menu') && stepTwo) {
        if (mutationTimeout) clearTimeout(mutationTimeout)
        mutationTimeout = setTimeout(async () => {
          await clickHighQuality()
        }, 300)
      }

      if (mutation.target.nodeName.toLowerCase() === 'ytd-watch-flexy') {
        const el = mutation.target as Element
        const isTheater = () =>
          checkAttributes(el, 'theater') &&
          checkYoutubeId(mutation.target.baseURI)
        const isFullScreen = () =>
          checkAttributes(el, 'fullscreen') &&
          checkYoutubeId(mutation.target.baseURI)
        const isHidden = () => checkAttributes(el, 'hidden')
        const isMain = () =>
          el.hasAttribute('role') && el.getAttribute('role') === 'main'
        if (
          mutation.attributeName === 'video-id' &&
          el.getAttribute('video-id') &&
          (document.querySelector('ytd-watch-flexy')?.hasAttribute('theater') ||
            document
              .querySelector('ytd-watch-flexy')
              ?.hasAttribute('fullscreen'))
        ) {
          if (!stepOne && localStorage.getItem('ytme-hq') === 'true') {
            await callHighQuality()
          }
        }
        if (
          mutation.attributeName === 'hidden' ||
          mutation.attributeName === 'role'
        ) {
          if (isHidden() && !isMain()) {
            restoreBind()
          } else if (isTheater()) {
            ytmeInitial(observer, target, config)
          }
        }
        if (mutation.attributeName === 'theater') {
          if (isTheater()) {
            ytmeInitial(observer, target, config)
          } else {
            restoreBind()
          }
        } else if (mutation.attributeName === 'fullscreen') {
          if (isFullScreen()) {
            ytmeInitial(observer, target, config)
          } else if (!isTheater()) {
            restoreBind()
          }
        }
      }
      if (mutation.type === 'attributes') {
        if (
          mutation.target.nodeName === 'VIDEO' &&
          mutation.attributeName !== 'tabindex' &&
          checkYoutubeId(mutation.target.baseURI)
        ) {
          if (timeout) {
            clearTimeout(timeout)
          }
          timeout = setTimeout(async () => {
            initPosition(observer)
            observer.observe(target, config)
          }, 600)
        }
      }
    })
  })

  // 감시자 옵션 포함, 대상 노드에 전달
  observer.observe(target, config)
}
main()
