import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SUPDATE — Weekly Accountability',
  description: 'Show up. Send your update. Or face the group.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body style={{ background: '#0d0d14', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
