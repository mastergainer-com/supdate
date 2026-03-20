'use client'

import { useState } from 'react'

export function CopyInviteButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        background: copied ? 'rgba(0,212,255,0.2)' : '#00d4ff',
        color: copied ? '#00d4ff' : '#000000',
        fontWeight: '700',
        padding: '0.4rem 1rem',
        borderRadius: '0.375rem',
        border: copied ? '1px solid rgba(0,212,255,0.4)' : 'none',
        cursor: 'pointer',
        fontSize: '0.8rem',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s',
        flexShrink: 0,
      }}
    >
      {copied ? '✓ Kopiert!' : 'Kopieren'}
    </button>
  )
}
