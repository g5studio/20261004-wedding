import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import gsap from 'gsap'
import { depthScenes } from '@/data/wedding'
import {
  distanceToScene,
  getCameraDirectionHint,
  getSceneProgress,
  sampleCameraPath,
  scenePoses,
} from '@/shared/camera-path'
import {
  depthFocusDistancePx,
  depthPerspectivePx,
  sceneInputCooldownMs,
  sceneTouchSwipeThresholdPx,
  sceneTransitionDurationSeconds,
  sceneWheelThreshold,
} from '@/shared/constants/scroll.constants'
import './depth-stage.css'

const ambientLayerCount = 6

type DepthStageProps = {
  /**
   * 回傳 0–1 場景進度（以場景索引計算，非轉場中間值）。
   */
  onSceneProgress?: (progress: number) => void
}

/**
 * 離散場景切換的 3D 舞台：每次滾動完整播完一幕轉場，無法停在中間。
 */
export function DepthStage({ onSceneProgress }: DepthStageProps) {
  const stageRef = useRef<HTMLElement>(null)
  const cameraRef = useRef<HTMLDivElement>(null)
  const sceneRefs = useRef<Array<HTMLElement | null>>([])
  const activeIndexRef = useRef(0)
  const journeyProgressRef = useRef(0)
  const isAnimatingRef = useRef(false)
  const inputLockedRef = useRef(false)
  const directionHintRef = useRef('滾動切換下一幕')
  const touchStartYRef = useRef<number | null>(null)
  const touchConsumedRef = useRef(false)
  const transitionTweenRef = useRef<gsap.core.Tween | null>(null)
  const unlockTimerRef = useRef<number | null>(null)
  const goToSceneRef = useRef<(index: number) => void>(() => {})
  const onSceneProgressRef = useRef(onSceneProgress)

  const [activeIndex, setActiveIndex] = useState(0)
  const [directionHint, setDirectionHint] = useState('滾動切換下一幕')
  const [isStatic, setIsStatic] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const sceneCount = depthScenes.length
  const lastSceneIndex = sceneCount - 1

  useEffect(() => {
    onSceneProgressRef.current = onSceneProgress
  }, [onSceneProgress])

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

    const getAmbientLayers = () =>
      Array.from(
        cameraNode.querySelectorAll<HTMLElement>('[data-ambient-layer]'),
      )

    const reportProgress = (index: number) => {
      onSceneProgressRef.current?.(
        lastSceneIndex <= 0 ? 1 : index / lastSceneIndex,
      )
    }

    const applyCamera = (progress: number) => {
      journeyProgressRef.current = progress
      const camera = sampleCameraPath(progress)
      cameraNode.style.transform = [
        `rotateX(${-camera.rx}deg)`,
        `rotateY(${-camera.ry}deg)`,
        `rotateZ(${-camera.rz}deg)`,
        `translate3d(${-camera.x}px, ${-camera.y}px, ${-camera.z}px)`,
      ].join(' ')

      getScenes().forEach((scene, index) => {
        const pose = scenePoses[index] ?? scenePoses[0]
        const distance = distanceToScene(camera, pose)
        const visibility = gsap.utils.clamp(
          0,
          1,
          1 - distance / depthFocusDistancePx,
        )
        gsap.set(scene, {
          opacity: visibility,
          filter: `blur(${(1 - visibility) * 12}px)`,
          scale: 0.88 + visibility * 0.12,
        })
      })

      getAmbientLayers().forEach((layer) => {
        const distance = distanceToScene(camera, {
          x: Number(gsap.getProperty(layer, 'x')),
          y: Number(gsap.getProperty(layer, 'y')),
          z: Number(gsap.getProperty(layer, 'z')),
        })
        gsap.set(layer, {
          opacity: gsap.utils.clamp(
            0.04,
            0.32,
            1 - distance / (depthFocusDistancePx * 1.6),
          ),
        })
      })

      const hint = getCameraDirectionHint(camera)
      if (hint !== directionHintRef.current) {
        directionHintRef.current = hint
        setDirectionHint(hint)
      }
    }

    const placeWorld = () => {
      getScenes().forEach((scene, index) => {
        const pose = scenePoses[index] ?? scenePoses[0]
        gsap.set(scene, {
          force3D: true,
          x: pose.x,
          y: pose.y,
          z: pose.z,
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

    const goToScene = (nextIndex: number) => {
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
        ease: 'power2.inOut',
        onUpdate: () => {
          applyCamera(state.p)
        },
        onComplete: () => {
          activeIndexRef.current = targetIndex
          setActiveIndex(targetIndex)
          reportProgress(targetIndex)
          applyCamera(toProgress)

          if (targetIndex === 0) {
            setDirectionHint('滾動切換下一幕')
            directionHintRef.current = '滾動切換下一幕'
          }

          releaseInputLock()
        },
      })

      return true
    }

    goToSceneRef.current = goToScene

    const stepScene = (direction: -1 | 1) => {
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

      if (prefersReducedMotion.matches) {
        document.documentElement.classList.remove('depth-scene-lock')
        activeIndexRef.current = 0
        setActiveIndex(0)
        reportProgress(0)
        setDirectionHint('靜態閱讀模式')
        directionHintRef.current = '靜態閱讀模式'
        return
      }

      document.documentElement.classList.add('depth-scene-lock')
      placeWorld()
      activeIndexRef.current = 0
      setActiveIndex(0)
      reportProgress(0)
      applyCamera(getSceneProgress(0))
      setDirectionHint('滾動切換下一幕')
      directionHintRef.current = '滾動切換下一幕'
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
                data-tone={scene.tone}
                aria-hidden={!isStatic && activeIndex !== index}
              >
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
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="depth-stage__fog" aria-hidden="true" />
        <div className="depth-stage__vignette" aria-hidden="true" />

        <div className="depth-stage__hud">
          <div>
            <p className="depth-stage__hud-label">Scene Step Demo</p>
            <p className="depth-stage__hud-index">
              {String(activeIndex + 1).padStart(2, '0')} /{' '}
              {String(sceneCount).padStart(2, '0')}
            </p>
            <p className="depth-stage__hud-hint">
              {isAnimating ? directionHint : '一次滾動 = 完整切換一幕'}
            </p>
          </div>
          {activeIndex === 0 && !isAnimating ? (
            <p className="depth-stage__hint hint-pulse">向下滾動進入下一幕</p>
          ) : (
            <span />
          )}
        </div>

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
