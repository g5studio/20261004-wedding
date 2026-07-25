import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import {
  lenisDurationSeconds,
  lenisWheelMultiplier,
} from '@/shared/constants/scroll.constants'

gsap.registerPlugin(ScrollTrigger)

let activeLenis: Lenis | null = null

type SmoothScrollOptions = {
  /**
   * 是否啟用 Lenis；離散場景切換模式下應關閉，避免與滾輪搶控制權。
   */
  enabled?: boolean
}

/**
 * 初始化 Lenis，並與 GSAP ScrollTrigger / ticker 同步。
 */
export function useSmoothScroll(options: SmoothScrollOptions = {}) {
  const enabled = options.enabled ?? true

  useEffect(() => {
    if (!enabled) {
      return
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    )

    if (prefersReducedMotion.matches) {
      return
    }

    const lenis = new Lenis({
      duration: lenisDurationSeconds,
      wheelMultiplier: lenisWheelMultiplier,
      touchMultiplier: 1.1,
      smoothWheel: true,
      autoRaf: false,
    })

    activeLenis = lenis
    lenis.on('scroll', ScrollTrigger.update)

    const tick = (time: number) => {
      lenis.raf(time * 1000)
    }

    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    document.documentElement.classList.add('lenis')

    const teardown = () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
      if (activeLenis === lenis) {
        activeLenis = null
      }
      document.documentElement.classList.remove('lenis')
      ScrollTrigger.refresh()
    }

    const onReducedMotionChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        teardown()
      }
    }

    prefersReducedMotion.addEventListener('change', onReducedMotionChange)

    return () => {
      prefersReducedMotion.removeEventListener('change', onReducedMotionChange)
      teardown()
    }
  }, [enabled])
}

/**
 * 以 Lenis 平滑捲至目標；無 Lenis 時退回原生 scrollIntoView。
 */
export function scrollToTarget(target: string | HTMLElement) {
  const element =
    typeof target === 'string' ? document.querySelector(target) : target

  if (!(element instanceof HTMLElement)) {
    return
  }

  if (activeLenis) {
    activeLenis.scrollTo(element, { offset: 0 })
    return
  }

  element.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
