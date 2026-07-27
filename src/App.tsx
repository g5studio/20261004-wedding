import { useState } from 'react'
import { DepthStage } from '@/components/immersive/depth-stage'
import { InvitationPopup } from '@/components/invitation/invitation-popup'
import { ScrollProgress } from '@/components/layout/scroll-progress'
import { useSmoothScroll } from '@/hooks/use-smooth-scroll'

/**
 * 喜帖主頁：離散場景切換的 3D 鏡頭路徑 demo。
 */
function App() {
  // 離散切換時關閉 Lenis，避免滾輪被平滑滾動吃掉。
  useSmoothScroll({ enabled: false })
  const [progress, setProgress] = useState(0)
  const [invitationOpenRequest, setInvitationOpenRequest] = useState(0)

  /**
   * 由序章印章觸發重新開啟喜帖。
   */
  function requestInvitationOpen() {
    setInvitationOpenRequest((currentRequest) => currentRequest + 1)
  }

  return (
    <main className="relative">
      <InvitationPopup openRequest={invitationOpenRequest} />
      <ScrollProgress progress={progress} />
      <DepthStage
        onSceneProgress={setProgress}
        onInvitationRequest={requestInvitationOpen}
      />
    </main>
  )
}

export default App
