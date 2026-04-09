'use client'

import { useState } from 'react'

interface UserSettingsFormProps {
  userId: string
  initialProfile: {
    name: string | null
    email: string | null
    telegram_handle: string | null
    telegram_chat_id: string | null
    streak_count: number | null
    pause_until: string | null
  } | null
}

export default function UserSettingsForm({ userId, initialProfile }: UserSettingsFormProps) {
  const [telegramHandle, setTelegramHandle] = useState(initialProfile?.telegram_handle || '')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [isPaused, setIsPaused] = useState(
    initialProfile?.pause_until ? new Date(initialProfile.pause_until) > new Date() : false
  )
  const [pauseUntil, setPauseUntil] = useState(initialProfile?.pause_until)

  const isConnected = !!initialProfile?.telegram_chat_id

  const handleSaveTelegram = async () => {
    setIsSaving(true)
    setMessage('')

    try {
      const res = await fetch('/api/telegram/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramHandle }),
      })

      const data = await res.json()

      if (data.success) {
        setMessage('✅ Telegram-Handle gespeichert!')
      } else {
        setMessage('❌ Fehler: ' + data.error)
      }
    } catch (err) {
      setMessage('❌ Fehler beim Speichern')
    } finally {
      setIsSaving(false)
    }
  }

  const handleStartPause = async () => {
    setIsSaving(true)
    setMessage('')

    try {
      const res = await fetch('/api/pause/start', { method: 'POST' })
      const data = await res.json()

      if (data.success) {
        setIsPaused(true)
        setPauseUntil(data.pauseUntil)
        setMessage('🌴 Pause gestartet!')
      } else {
        setMessage('❌ ' + (data.error || 'Fehler'))
      }
    } catch (err) {
      setMessage('❌ Fehler beim Starten der Pause')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEndPause = async () => {
    setIsSaving(true)
    setMessage('')

    try {
      const res = await fetch('/api/pause/end', { method: 'POST' })
      const data = await res.json()

      if (data.success) {
        setIsPaused(false)
        setPauseUntil(null)
        setMessage('🚀 Pause beendet! Willkommen zurück.')
      } else {
        setMessage('❌ Fehler')
      }
    } catch (err) {
      setMessage('❌ Fehler beim Beenden der Pause')
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Einstellungen</h1>

      {/* Streak Card */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-6 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-100 text-sm">Deine Streak</p>
            <p className="text-4xl font-bold">{initialProfile?.streak_count || 0}</p>
            <p className="text-orange-100 text-sm">Wochen in Folge</p>
          </div>
          <div className="text-6xl">🔥</div>
        </div>
      </div>

      {/* Telegram Section */}
      <div className="bg-gray-900 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.223-.548.223l.188-2.623 4.823-4.351c.192-.192-.054-.3-.297-.108l-5.965 3.759-2.568-.802c-.56-.176-.57-.56.117-.828l10.037-3.869c.466-.174.875.108.713.827z"/>
          </svg>
          Telegram Benachrichtigungen
        </h2>

        {isConnected ? (
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
            <p className="text-green-400 flex items-center gap-2">
              <span className="text-xl">✅</span>
              Verbunden mit Telegram
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Du erhältst Reminder direkt in Telegram.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-gray-400 mb-4">
              Verbinde deinen Telegram-Account, um Erinnerungen direkt in Telegram zu erhalten.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={telegramHandle}
                onChange={(e) => setTelegramHandle(e.target.value)}
                placeholder="@deinusername"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSaveTelegram}
                disabled={isSaving || !telegramHandle}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {isSaving ? '...' : 'Speichern'}
              </button>
            </div>
            <p className="text-gray-500 text-sm mt-2">
              💡 Nach dem Speichern: Starte{' '}
              <a
                href="https://t.me/SUPDATE_Reminder_Bot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                @SUPDATE_Reminder_Bot
              </a>{' '}
              und sende /start
            </p>
          </div>
        )}
      </div>

      {/* Pause Section */}
      <div className="bg-gray-900 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-xl">🌴</span>
          Pause
        </h2>

        {isPaused ? (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
            <p className="text-yellow-400 font-medium">
              Du bist in Pause
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Bis: {pauseUntil ? formatDate(pauseUntil) : 'unbekannt'}
            </p>
            <p className="text-gray-500 text-sm mt-2">
              ✅ Keine Strikes • ✅ Keine Reminder • ✅ Automatische Wiederaufnahme
            </p>
            <button
              onClick={handleEndPause}
              disabled={isSaving}
              className="mt-4 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Pause vorzeitig beenden
            </button>
          </div>
        ) : (
          <div>
            <p className="text-gray-400 mb-4">
              Brauchst du eine Auszeit? Starte eine Pause von bis zu 2 Wochen.
              In der Zeit erhältst du keine Strikes und keine Reminder.
            </p>
            <button
              onClick={handleStartPause}
              disabled={isSaving}
              className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              2 Wochen Pause starten
            </button>
          </div>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <p className={message.startsWith('✅') || message.startsWith('🚀') || message.startsWith('🌴') ? 'text-green-400' : 'text-red-400'}>
            {message}
          </p>
        </div>
      )}
    </div>
  )
}
