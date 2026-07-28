import { useEffect, useState, type KeyboardEvent } from 'react'
import { invitationSchedule, wedding } from '@/data/wedding'
import { invitationPopupOpenDelayMs } from '@/shared/constants/time.constants'
import './invitation-popup.css'

type InvitationIconName = (typeof invitationSchedule)[number]['icon']

type InvitationIconProps = {
  name: InvitationIconName
}

type InvitationPopupProps = {
  /**
   * 數值更新時重新顯示關閉後的喜帖。
   */
  openRequest: number
}

function InvitationIcon({ name }: InvitationIconProps) {
  if (name === 'entry') {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M10 39h28M14 39V12h20v27M18 12V8h12v4M24 20v11M19 25h10" />
        <path d="M6 18h6M36 18h6M9 14l3 3M39 14l-3 3" />
      </svg>
    )
  }

  if (name === 'rings') {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="19" cy="26" r="9" />
        <circle cx="29" cy="22" r="9" />
        <path d="m14 15 3-4 4 2M34 11l3 4-4 2" />
      </svg>
    )
  }

  if (name === 'banquet') {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M8 17h32M12 17v20M36 17v20M8 37h32M18 17v20M30 17v20" />
        <path d="M15 10h18l3 7H12zM20 25h8M20 30h8" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M8 18h32v19H8zM6 18h36M12 13h24M16 8h16" />
      <path d="M16 24v7M24 24v7M32 24v7M12 37v3M36 37v3" />
    </svg>
  )
}

/**
 * 序章入口的摺頁喜帖 popup，提供婚禮當日時間與場地資訊。
 */
export function InvitationPopup({ openRequest }: InvitationPopupProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isOpened, setIsOpened] = useState(false)

  /**
   * 立即展開喜帖，供封面點擊與鍵盤操作共用。
   */
  function openInvitation() {
    setIsOpened(true)
  }

  /**
   * 讓封面可透過 Enter 或空白鍵展開。
   */
  function handleCoverKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openInvitation()
    }
  }

  useEffect(() => {
    setIsVisible(true)
    setIsOpened(false)
    const openTimer = window.setTimeout(
      () => setIsOpened(true),
      invitationPopupOpenDelayMs,
    )

    return () => window.clearTimeout(openTimer)
  }, [openRequest])

  if (!isVisible) {
    return null
  }

  return (
    <div
      className={`invitation-popup${isOpened ? ' invitation-popup--opened' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="invitation-popup-title"
    >
      <div className="invitation-popup__backdrop" aria-hidden="true" />
      <div className="invitation-popup__book">
        <div className="invitation-popup__inside">
          <div className="invitation-popup__inside-content">
          <div className="invitation-popup__header">
            <span className="invitation-popup__eyebrow">Wedding Invitation</span>
            <h2 className="invitation-popup__sr-title" id="invitation-popup-title">
              William &amp; Jill
            </h2>
          </div>

          <section className="invitation-popup__hero" aria-label="新人與婚禮資訊">
            <img
              src={`${import.meta.env.BASE_URL}images/invitation-inner-banner.png`}
              alt="William 與 Jill 身穿中式婚服的合照"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
            <div className="invitation-popup__hero-shade" />
            <div className="invitation-popup__hero-copy">
              <span>THE WEDDING OF</span>
              <h2>William <i>&amp;</i> Jill</h2>
              <time dateTime={wedding.date.iso}>
                {wedding.date.display}・{wedding.date.weekday}
              </time>
            </div>
          </section>

          <div className="invitation-popup__facts">
            <div className="invitation-popup__fact invitation-popup__fact--venue">
              <span>VENUE</span>
              <strong>{wedding.venue.name}</strong>
              <small>{wedding.venue.address}</small>
            </div>
            <div className="invitation-popup__fact">
              <span>CEREMONY</span>
              <strong>{wedding.ceremony.time}・{wedding.ceremony.name}</strong>
              <small>{wedding.ceremony.location}</small>
            </div>
            <div className="invitation-popup__fact">
              <span>BANQUET</span>
              <strong>{wedding.banquet.time}・午宴開始</strong>
              <small>{wedding.banquet.location}</small>
            </div>
          </div>

          <div className="invitation-popup__schedule" aria-label="婚禮當日流程">
            {invitationSchedule.map((item) => (
              <div className="invitation-popup__event" key={`${item.time}-${item.description}`}>
                <div className="invitation-popup__event-icon">
                  <InvitationIcon name={item.icon} />
                </div>
                <div className="invitation-popup__event-copy">
                  <strong>{item.time}</strong>
                  <span>{item.description}</span>
                </div>
              </div>
            ))}
          </div>

          <button
            className="invitation-popup__enter"
            type="button"
            onClick={() => setIsVisible(false)}
          >
            進入序章
          </button>
          </div>
        </div>
        <div
          className="invitation-popup__cover"
          role="button"
          tabIndex={isOpened ? -1 : 0}
          aria-label="打開喜帖"
          onClick={openInvitation}
          onKeyDown={handleCoverKeyDown}
        >
          <div className="invitation-popup__cover-half invitation-popup__cover-left">
            <div
              className="invitation-popup__cover-face invitation-popup__cover-front"
              style={{
                backgroundImage: `url("${import.meta.env.BASE_URL}images/invitation-cover-photo.png")`,
              }}
            />
            <div className="invitation-popup__cover-face invitation-popup__cover-back" />
          </div>
          <div className="invitation-popup__cover-half invitation-popup__cover-right">
            <div className="invitation-popup__cover-face invitation-popup__cover-front">
              <div className="invitation-popup__cover-names">
                <span>William</span>
                <b>AND</b>
                <span>Jill</span>
              </div>
              <div className="invitation-popup__cover-date">
                <em>Save the Date</em>
                <time dateTime={wedding.date.iso}>2026/10/04</time>
              </div>
            </div>
            <div className="invitation-popup__cover-face invitation-popup__cover-back" />
          </div>
        </div>
      </div>
    </div>
  )
}
