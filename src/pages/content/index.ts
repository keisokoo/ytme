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
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

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
const createSVG = (d: string) => {
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
const createButtons = () => {
  removeButtons()
  if (!dragZoom) return
  const restoreButton = createSVG(
    'M20.673,16.932l4.276,-0c0.445,-0 0.802,-0.358 0.802,-0.803l0,-4.275c0,-0.325 -0.193,-0.619 -0.494,-0.742c-0.301,-0.124 -0.645,-0.058 -0.876,0.174l-1.389,1.389c-2.927,-2.889 -7.641,-2.879 -10.551,0.033c-2.922,2.924 -2.922,7.661 0,10.584c2.924,2.923 7.661,2.923 10.584,-0c0.417,-0.418 0.417,-1.096 -0,-1.514c-0.418,-0.417 -1.096,-0.417 -1.513,0c-2.088,2.088 -5.473,2.088 -7.561,0c-2.087,-2.088 -2.087,-5.472 0,-7.56c2.078,-2.078 5.436,-2.088 7.527,-0.033l-1.373,1.376c-0.231,0.231 -0.297,0.575 -0.173,0.876c0.123,0.301 0.417,0.495 0.741,0.495Z'
  )
  const moveButton = createSVG(
    'M18.707,10.339c-0.391,-0.391 -1.026,-0.391 -1.417,0l-2,2.001c-0.288,0.287 -0.372,0.716 -0.216,1.091c0.156,0.375 0.519,0.619 0.925,0.619l1.001,-0l-0,3.001l-3.002,0l0,-1.003c0,-0.404 -0.243,-0.769 -0.619,-0.926c-0.375,-0.156 -0.803,-0.069 -1.091,0.216l-2.001,2.001c-0.39,0.391 -0.39,1.025 0,1.416l2.001,2.001c0.288,0.287 0.716,0.372 1.091,0.215c0.376,-0.156 0.619,-0.518 0.619,-0.925l0,-0.997l3.002,-0l-0,3.001l-1.001,0c-0.403,0 -0.769,0.244 -0.925,0.619c-0.156,0.375 -0.069,0.804 0.216,1.091l2,2.001c0.391,0.391 1.026,0.391 1.417,-0l2,-2.001c0.288,-0.287 0.372,-0.716 0.216,-1.091c-0.156,-0.375 -0.519,-0.619 -0.925,-0.619l-0.998,0l0,-3.001l3.002,-0l-0,1c-0,0.404 0.243,0.769 0.619,0.926c0.375,0.156 0.803,0.068 1.091,-0.216l2.001,-2.001c0.39,-0.391 0.39,-1.025 -0,-1.416l-2.001,-2.001c-0.288,-0.288 -0.716,-0.372 -1.091,-0.216c-0.376,0.157 -0.619,0.519 -0.619,0.926l-0,1l-3.002,0l0,-3.004l1.001,-0c0.403,-0 0.769,-0.244 0.925,-0.619c0.156,-0.375 0.069,-0.804 -0.216,-1.091l-2,-2.001l-0.003,0.003Z'
  )
  dragZoom.ts = dragZoom.getPosition()
  const { button: HighQualityButton } = createTextButton('HQ')
  const { button: rotateButton, span: rotateDiv } = createTextButton(
    dragZoom.ts.rotate + '°'
  )
  checkToggle('ytme-hq', HighQualityButton)
  checkToggle('ytme-move', moveButton)
  HighQualityButton.onclick = async (e) => {
    e.stopPropagation()
    const hqOn = localStorage.getItem('ytme-hq')
    if (!hqOn || hqOn === 'false') {
      localStorage.setItem('ytme-hq', 'true')
      HighQualityButton.classList.add('active')
    } else {
      localStorage.setItem('ytme-hq', 'false')
      HighQualityButton.classList.remove('active')
    }
  }
  rotateButton.onclick = (e) => {
    e.stopPropagation()
    dragZoom.ts = dragZoom.getPosition()
    dragZoom.ts = {
      ...dragZoom.ts,
      rotate: dragZoom.toggleRotation(dragZoom.ts.rotate),
    }
    rotateDiv.innerText = dragZoom.ts.rotate + '°'
    dragZoom.setTransform()
  }
  restoreButton.onclick = (e) => {
    e.stopPropagation()
    rotateDiv.innerText = 0 + '°'
    dragZoom.restore()
  }

  moveButton.onclick = (e) => {
    e.stopPropagation()
    const moveOn = localStorage.getItem('ytme-move')
    if (!moveOn || moveOn === 'false') {
      localStorage.setItem('ytme-move', 'true')
      moveButton.classList.add('active')
    } else {
      localStorage.setItem('ytme-move', 'false')
      moveButton.classList.remove('active')
    }
  }
  document.querySelector('.ytp-right-controls').prepend(HighQualityButton)
  document.querySelector('.ytp-right-controls').prepend(rotateButton)
  document.querySelector('.ytp-right-controls').prepend(moveButton)
  document.querySelector('.ytp-right-controls').prepend(restoreButton)
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
        observer.observe(target, config)
      },
    })
    const Header = document.querySelector('#masthead-container') as HTMLElement
    Header.addEventListener('mouseenter', addActiveHeader)
    currentVideo.addEventListener('mouseenter', removeActiveHeader)
    currentVideo.addEventListener('mousedown', dragZoom.on)
    parentElement.addEventListener('wheel', dragZoom.onWheel)
    createButtons()
  }
  if (!stepOne) {
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
    panels.click()
  } else {
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
  stepTwo = false
  await sleep(100)
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
    mutations.forEach(function (mutation) {
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
