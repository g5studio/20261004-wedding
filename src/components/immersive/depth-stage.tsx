import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import gsap from 'gsap'
import { depthScenes, wedding } from '@/data/wedding'
import {
  getSceneProgress,
  sampleCameraPath,
  sceneProgressStops,
} from '@/shared/camera-path'
import {
  depthFocusDistancePx,
  depthPerspectivePx,
  sceneInputCooldownMs,
  sceneTouchSwipeThresholdPx,
  sceneTransitionDurationSeconds,
  sceneWheelThreshold,
} from '@/shared/constants/scroll.constants'
import { sceneImagePreloadStartDelayMs } from '@/shared/constants/time.constants'
import './depth-stage.css'

const ambientLayerCount = 6

/**
 * 相機旋轉幅度倍率，保留方向感並限制文字與照片的位移。
 */
const cameraRotationScale = {
  x: 0.18,
  y: 0.1,
  z: 0.06,
} as const

/**
 * 相機橫向與垂直位移倍率，讓鏡頭依序從不同方向進入場景。
 */
const cameraPositionScale = 0.45

type DepthStageProps = {
  /**
   * 回傳 0–1 場景進度（以場景索引計算，非轉場中間值）。
   */
  onSceneProgress?: (progress: number) => void
  /**
   * 點擊序章印章時重新開啟喜帖。
   */
  onInvitationRequest?: () => void
}

/**
 * 離散場景切換的 3D 舞台：每次滾動完整播完一幕轉場，無法停在中間。
 */
export function DepthStage({
  onSceneProgress,
  onInvitationRequest,
}: DepthStageProps) {
  const stageRef = useRef<HTMLElement>(null)
  const cameraRef = useRef<HTMLDivElement>(null)
  const introRef = useRef<HTMLDivElement>(null)
  const sceneRefs = useRef<Array<HTMLElement | null>>([])
  const activeIndexRef = useRef(0)
  const journeyProgressRef = useRef(0)
  const isAnimatingRef = useRef(false)
  const inputLockedRef = useRef(false)
  const touchStartYRef = useRef<number | null>(null)
  const touchConsumedRef = useRef(false)
  const transitionTweenRef = useRef<gsap.core.Tween | null>(null)
  const introTweenRef = useRef<gsap.core.Timeline | null>(null)
  const unlockTimerRef = useRef<number | null>(null)
  const isIntroRef = useRef(true)
  const goToSceneRef = useRef<(index: number) => void>(() => {})
  const onSceneProgressRef = useRef(onSceneProgress)

  const [activeIndex, setActiveIndex] = useState(0)
  const [isStatic, setIsStatic] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isIntro, setIsIntro] = useState(true)
  const [preparedSceneCount, setPreparedSceneCount] = useState(0)

  const sceneCount = depthScenes.length
  const lastSceneIndex = sceneCount - 1

  useEffect(() => {
    onSceneProgressRef.current = onSceneProgress
  }, [onSceneProgress])

  useEffect(() => {
    let isCancelled = false

    /**
     * 先透過獨立 Image 物件完成下載與解碼，避免場景顯示時才開始請求。
     */
    function prepareImage(src: string, fetchPriority: 'high' | 'low') {
      return new Promise<void>((resolve) => {
        const image = new Image()
        image.decoding = 'async'
        image.fetchPriority = fetchPriority
        image.onload = () => {
          image.decode().then(
            () => resolve(),
            () => resolve(),
          )
        }
        image.onerror = () => resolve()
        image.src = src
      })
    }

    /**
     * 每一幕的背景與婚紗照為一批，完成後才開始下一幕。
     */
    async function prepareScenesInOrder() {
      for (const [index, scene] of depthScenes.entries()) {
        const sceneSources = [
          scene.background.src,
          ...(scene.image ? [scene.image.src] : []),
        ]

        await Promise.all(
          sceneSources.map((src) =>
            prepareImage(src, index === 0 ? 'high' : 'low'),
          ),
        )

        if (isCancelled) {
          return
        }

        setPreparedSceneCount(index + 1)
      }
    }

    const preloadTimer = window.setTimeout(() => {
      void prepareScenesInOrder()
    }, sceneImagePreloadStartDelayMs)

    return () => {
      isCancelled = true
      window.clearTimeout(preloadTimer)
    }
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    const cameraNode = cameraRef.current
    if (!stage || !cameraNode) {
      return
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    )

    const clearTimers = () => {
      if (unlockTimerRef.current != null) {
        window.clearTimeout(unlockTimerRef.current)
        unlockTimerRef.current = null
      }
    }

    const getScenes = () =>
      sceneRefs.current.filter(
        (node): node is HTMLElement => node instanceof HTMLElement,
      )

    const reportProgress = (index: number) => {
      onSceneProgressRef.current?.(
        lastSceneIndex <= 0 ? 1 : index / lastSceneIndex,
      )
    }

    const getAmbientLayers = () =>
      Array.from(
        cameraNode.querySelectorAll<HTMLElement>('[data-ambient-layer]'),
      )

    const smoothStep = (value: number) => {
      const clamped = gsap.utils.clamp(0, 1, value)
      return clamped * clamped * (3 - 2 * clamped)
    }

    const getSceneOpacity = (index: number, progress: number) => {
      const sceneProgress = getSceneProgress(index)

      if (index > 0) {
        const previousProgress = getSceneProgress(index - 1)
        if (progress >= previousProgress && progress < sceneProgress) {
          return smoothStep(
            (progress - previousProgress) / (sceneProgress - previousProgress),
          )
        }
      }

      if (index < lastSceneIndex) {
        const nextProgress = getSceneProgress(index + 1)
        if (progress >= sceneProgress && progress <= nextProgress) {
          return 1 - smoothStep(
            (progress - sceneProgress) / (nextProgress - sceneProgress),
          )
        }
      }

      return progress === sceneProgress ? 1 : 0
    }

    const getDirectionalTransitionFactor = (progress: number) => {
      const nextStopIndex = sceneProgressStops.findIndex(
        (stop) => stop > progress,
      )
      if (nextStopIndex <= 0 || nextStopIndex >= sceneProgressStops.length) {
        return 0
      }

      const previousStop = sceneProgressStops[nextStopIndex - 1]
      const nextStop = sceneProgressStops[nextStopIndex]
      const segmentProgress =
        (progress - previousStop) / (nextStop - previousStop)

      return Math.sin(Math.PI * gsap.utils.clamp(0, 1, segmentProgress))
    }

    const applyCamera = (progress: number) => {
      journeyProgressRef.current = progress
      const camera = sampleCameraPath(progress)
      const isMobileViewport = window.innerWidth <= 767
      const directionFactor = getDirectionalTransitionFactor(progress)
      const cameraX = isMobileViewport
        ? 0
        : camera.x * cameraPositionScale * directionFactor
      const cameraY = isMobileViewport
        ? 0
        : camera.y * cameraPositionScale * directionFactor
      const cameraRotationX = isMobileViewport
        ? 0
        : camera.rx * cameraRotationScale.x * directionFactor
      const cameraRotationY = isMobileViewport
        ? 0
        : camera.ry * cameraRotationScale.y * directionFactor
      const cameraRotationZ = isMobileViewport
        ? 0
        : camera.rz * cameraRotationScale.z * directionFactor
      const cameraZoom = isMobileViewport
        ? 1
        : 1 + directionFactor * 0.08
      cameraNode.style.transform = [
        `translate3d(${-cameraX}px, ${-cameraY}px, 0)`,
        `rotateX(${cameraRotationX}deg)`,
        `rotateY(${cameraRotationY}deg)`,
        `rotateZ(${cameraRotationZ}deg)`,
        `scale(${cameraZoom})`,
      ].join(' ')

      const sceneDistanceList = getScenes()
      sceneDistanceList.forEach((scene, index) => {
        const visibility = getSceneOpacity(index, progress)
        const depthProgress = gsap.utils.clamp(
          -1,
          1,
          (camera.z - Number(gsap.getProperty(scene, 'z'))) /
            depthFocusDistancePx,
        )
        const horizontalProgress = 0
        scene.style.opacity = String(visibility)
        scene.style.setProperty('--scene-depth-progress', String(depthProgress))
        scene.style.setProperty(
          '--scene-horizontal-progress',
          String(horizontalProgress),
        )
        scene.style.setProperty('--scene-visibility', String(visibility))
      })

    }

    const placeWorld = () => {
      const sceneScale = 1

      getScenes().forEach((scene) => {
        gsap.set(scene, {
          force3D: true,
          x: 0,
          y: 0,
          z: 0,
          scale: sceneScale,
          xPercent: -50,
          yPercent: -50,
        })
      })

      getAmbientLayers().forEach((layer, index) => {
        const side = index % 2 === 0 ? 1 : -1
        const depthRatio = (index + 1) / (ambientLayerCount + 1)
        gsap.set(layer, {
          force3D: true,
          xPercent: -50,
          yPercent: -50,
          x: side * (180 + index * 70),
          y: (index % 3) * 40 - 40,
          z: -depthRatio * 6200,
          rotationY: side * 8,
          opacity: 0.18,
        })
      })
    }

    const releaseInputLock = () => {
      clearTimers()
      // 只保留固定冷卻，避免觸控板慣性造成連切，同時避免永久等待 idle。
      unlockTimerRef.current = window.setTimeout(() => {
        inputLockedRef.current = false
        isAnimatingRef.current = false
        setIsAnimating(false)
      }, sceneInputCooldownMs)
    }

    const canAcceptStep = () =>
      !inputLockedRef.current &&
      !isAnimatingRef.current &&
      !prefersReducedMotion.matches

    const enterAncient = () => {
      if (!isIntroRef.current || !canAcceptStep()) {
        return false
      }

      inputLockedRef.current = true
      isAnimatingRef.current = true
      setIsAnimating(true)
      introTweenRef.current?.kill()

      const intro = introRef.current
      if (!intro) {
        isIntroRef.current = false
        setIsIntro(false)
        releaseInputLock()
        return true
      }

      introTweenRef.current = gsap
        .timeline({
          onComplete: () => {
            isIntroRef.current = false
            setIsIntro(false)
            releaseInputLock()
          },
        })
        .set(intro, { opacity: 1, scale: 1 })
        .set(intro.querySelectorAll('[data-ink-splash]'), {
          clearProps: 'all',
        })
        .to(intro.querySelectorAll('[data-ink-splash]'), {
          scale: 1.8,
          opacity: 0,
          duration: 0.95,
          stagger: 0.06,
          ease: 'power2.out',
        })
        .to(
          intro,
          {
            opacity: 0,
            scale: 1.08,
            duration: 0.75,
            ease: 'sine.inOut',
          },
          0.22,
        )

      return true
    }

    const showIntro = () => {
      if (
        isIntroRef.current ||
        activeIndexRef.current !== 0 ||
        !canAcceptStep()
      ) {
        return false
      }

      const intro = introRef.current
      if (!intro) {
        return false
      }

      inputLockedRef.current = true
      isAnimatingRef.current = true
      isIntroRef.current = true
      setIsIntro(true)
      setIsAnimating(true)
      introTweenRef.current?.kill()

      const inkSplashes = intro.querySelectorAll('[data-ink-splash]')
      gsap.set(intro, { opacity: 0, scale: 1.08 })
      gsap.set(inkSplashes, { clearProps: 'all' })

      introTweenRef.current = gsap.timeline({
        onComplete: () => {
          releaseInputLock()
        },
      })
      introTweenRef.current.to(intro, {
        opacity: 1,
        scale: 1,
        duration: 0.95,
        ease: 'sine.out',
      })

      return true
    }

    const goToScene = (nextIndex: number) => {
      if (isIntroRef.current) {
        return enterAncient()
      }

      const targetIndex = Math.min(lastSceneIndex, Math.max(0, nextIndex))
      const currentIndex = activeIndexRef.current

      if (targetIndex === currentIndex || !canAcceptStep()) {
        return false
      }

      if (prefersReducedMotion.matches) {
        activeIndexRef.current = targetIndex
        setActiveIndex(targetIndex)
        reportProgress(targetIndex)
        return true
      }

      inputLockedRef.current = true
      isAnimatingRef.current = true
      setIsAnimating(true)

      const state = { p: journeyProgressRef.current }
      const toProgress = getSceneProgress(targetIndex)

      transitionTweenRef.current?.kill()
      transitionTweenRef.current = gsap.to(state, {
        p: toProgress,
        duration: sceneTransitionDurationSeconds,
        ease: 'sine.inOut',
        onUpdate: () => {
          applyCamera(state.p)
        },
        onComplete: () => {
          activeIndexRef.current = targetIndex
          setActiveIndex(targetIndex)
          reportProgress(targetIndex)
          applyCamera(toProgress)

          releaseInputLock()
        },
      })

      return true
    }

    goToSceneRef.current = goToScene

    const stepScene = (direction: -1 | 1) => {
      if (direction < 0 && activeIndexRef.current === 0) {
        showIntro()
        return
      }

      goToScene(activeIndexRef.current + direction)
    }

    const onWheel = (event: WheelEvent) => {
      if (prefersReducedMotion.matches) {
        return
      }

      event.preventDefault()

      if (!canAcceptStep()) {
        return
      }

      if (Math.abs(event.deltaY) < sceneWheelThreshold) {
        return
      }

      if (isIntroRef.current) {
        if (event.deltaY > 0) {
          enterAncient()
        }
        return
      }

      stepScene(event.deltaY > 0 ? 1 : -1)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (prefersReducedMotion.matches || !canAcceptStep()) {
        return
      }

      if (
        event.key === 'ArrowDown' ||
        event.key === 'PageDown' ||
        event.key === ' '
      ) {
        event.preventDefault()
        stepScene(1)
        return
      }

      if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault()
        stepScene(-1)
      }
    }

    const onTouchStart = (event: TouchEvent) => {
      touchStartYRef.current = event.touches[0]?.clientY ?? null
      touchConsumedRef.current = false
    }

    const onTouchMove = (event: TouchEvent) => {
      if (prefersReducedMotion.matches || touchConsumedRef.current) {
        return
      }

      const startY = touchStartYRef.current
      const currentY = event.touches[0]?.clientY
      if (startY == null || currentY == null) {
        return
      }

      const deltaY = startY - currentY
      if (Math.abs(deltaY) < sceneTouchSwipeThresholdPx) {
        return
      }

      if (!canAcceptStep()) {
        return
      }

      event.preventDefault()
      touchConsumedRef.current = true
      stepScene(deltaY > 0 ? 1 : -1)
    }

    const onTouchEnd = () => {
      touchStartYRef.current = null
      touchConsumedRef.current = false
    }

    const setup = () => {
      transitionTweenRef.current?.kill()
      clearTimers()
      isAnimatingRef.current = false
      inputLockedRef.current = false
      setIsAnimating(false)
      setIsStatic(prefersReducedMotion.matches)
      isIntroRef.current = !prefersReducedMotion.matches
      setIsIntro(!prefersReducedMotion.matches)

      if (prefersReducedMotion.matches) {
        document.documentElement.classList.remove('depth-scene-lock')
        activeIndexRef.current = 0
        setActiveIndex(0)
        reportProgress(0)
        return
      }

      document.documentElement.classList.add('depth-scene-lock')
      placeWorld()
      activeIndexRef.current = 0
      setActiveIndex(0)
      reportProgress(0)
      applyCamera(getSceneProgress(0))
    }

    setup()

    stage.addEventListener('wheel', onWheel, { passive: false })
    stage.addEventListener('touchstart', onTouchStart, { passive: true })
    stage.addEventListener('touchmove', onTouchMove, { passive: false })
    stage.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('keydown', onKeyDown)
    prefersReducedMotion.addEventListener('change', setup)

    return () => {
      transitionTweenRef.current?.kill()
      introTweenRef.current?.kill()
      clearTimers()
      document.documentElement.classList.remove('depth-scene-lock')
      stage.removeEventListener('wheel', onWheel)
      stage.removeEventListener('touchstart', onTouchStart)
      stage.removeEventListener('touchmove', onTouchMove)
      stage.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('keydown', onKeyDown)
      prefersReducedMotion.removeEventListener('change', setup)
      goToSceneRef.current = () => {}
    }
  }, [lastSceneIndex])

  return (
    <section
      ref={stageRef}
      className={`depth-stage${isStatic ? ' depth-stage--static' : ''}${isAnimating ? ' depth-stage--animating' : ''}`}
      aria-label="3D 鏡頭路徑滾動場景"
      style={
        {
          '--depth-perspective': `${depthPerspectivePx}px`,
        } as CSSProperties
      }
    >
      <div className="depth-stage__viewport">
        <div
          ref={introRef}
          className={`depth-stage__intro${isIntro ? '' : ' depth-stage__intro--hidden'}`}
          aria-hidden={!isIntro}
        >
          <div className="depth-stage__intro-paper">
            <p className="depth-stage__intro-kicker">Three Lives, One Love</p>
            <h1>三生三世</h1>
            <p>一墨入唐，緣起於相逢</p>
            <div className="depth-stage__intro-guide">
              <div className="depth-stage__intro-guide-mobile">
                <div className="depth-stage__swipe-track" aria-hidden="true">
                  <svg
                    className="depth-stage__swipe-hand"
                    viewBox="0 0 72 72"
                    aria-hidden="true"
                  >
                    <path
                      fill="none"
                      d="M24 40V12a5 5 0 0 1 10 0v23M34 31v-8a5 5 0 0 1 10 0v14M44 34v-6a5 5 0 0 1 10 0v12M54 38v-4a5 5 0 0 1 10 0v14c0 11-9 20-20 20H32c-7 0-13-3-17-9L6 47a5 5 0 0 1 8-6l10 12"
                    />
                  </svg>
                </div>
                <span>向上滑動，入畫</span>
              </div>
              <div className="depth-stage__intro-guide-desktop">
                <span className="depth-stage__mouse" aria-hidden="true">
                  <i />
                </span>
                <span>向下滾動，入畫</span>
              </div>
            </div>
            <button
              className="depth-stage__intro-seal"
              type="button"
              onClick={onInvitationRequest}
              aria-label="再次開啟喜帖"
            >
              緣
            </button>
          </div>
          <span className="depth-stage__intro-brush" aria-hidden="true" />
          <span className="depth-stage__ink depth-stage__ink--a" data-ink-splash />
          <span className="depth-stage__ink depth-stage__ink--b" data-ink-splash />
          <span className="depth-stage__ink depth-stage__ink--c" data-ink-splash />
        </div>
        <div ref={cameraRef} className="depth-stage__camera">
          <div className="depth-stage__world">
            {Array.from({ length: ambientLayerCount }, (_, index) => (
              <div
                key={`ambient-${index}`}
                className="depth-ambient"
                data-ambient-layer
                aria-hidden="true"
              />
            ))}

            {depthScenes.map((scene, index) => (
              <article
                key={scene.id}
                ref={(node) => {
                  sceneRefs.current[index] = node
                }}
                className="depth-scene"
                data-era={scene.era}
                data-tone={scene.tone}
                aria-hidden={!isStatic && activeIndex !== index}
              >
                {index < preparedSceneCount ? (
                  <img
                    className="depth-scene__image"
                    src={scene.background.src}
                    alt={scene.background.alt}
                    loading="eager"
                    decoding="async"
                    fetchPriority={index === 0 ? 'high' : 'low'}
                    style={{
                      objectPosition: scene.background.position ?? 'center',
                    }}
                  />
                ) : null}
                <div className="depth-scene__image-wash" aria-hidden="true" />
                {scene.image && index < preparedSceneCount ? (
                  <img
                    className="depth-scene__photo"
                    src={scene.image.src}
                    alt={scene.image.alt}
                    loading="eager"
                    decoding="async"
                    fetchPriority={index === 0 ? 'high' : 'low'}
                    style={{
                      objectPosition: scene.image.position ?? 'center',
                    }}
                  />
                ) : null}
                <div
                  className="depth-scene__orb depth-scene__orb--a"
                  aria-hidden="true"
                />
                <div
                  className="depth-scene__orb depth-scene__orb--b"
                  aria-hidden="true"
                />
                <div className="depth-scene__panel">
                  <p className="depth-scene__eyebrow">{scene.eyebrow}</p>
                  <h2 className="depth-scene__title">{scene.title}</h2>
                  <p className="depth-scene__text">{scene.text}</p>
                  {scene.id === 'banquet' ? (
                    <a
                      className="depth-scene__venue-link"
                      href={wedding.venue.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      查看場地資訊
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="depth-stage__fog" aria-hidden="true" />
        <div className="depth-stage__vignette" aria-hidden="true" />

        <div className="depth-stage__rail">
          {depthScenes.map((scene, index) => (
            <button
              key={scene.id}
              type="button"
              className="depth-stage__rail-dot"
              data-active={activeIndex === index}
              aria-label={`前往第 ${index + 1} 幕`}
              disabled={isStatic || isAnimating}
              onClick={() => goToSceneRef.current(index)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
