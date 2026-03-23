import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { FirebaseProvider } from '@/app/components/firebase-provider'
import ssgLogo from '@/app/assets/ssg.png'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SSG',
  description: 'SSG Attendance System',
  icons: {
    icon: ssgLogo.src,
    shortcut: ssgLogo.src,
    apple: ssgLogo.src,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className}`}>
        <FirebaseProvider>{children}</FirebaseProvider>
      </body>
    </html>
  )
}
