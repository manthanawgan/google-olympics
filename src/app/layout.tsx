import type { Metadata } from 'next'
import { Syne } from 'next/font/google'
import './globals.css'

const syne = Syne({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GDG-VitBhopal',
  description: 'Google Developer Group Vit Bhopal',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${syne.className} antialiased min-h-screen bg-white relative overflow-x-hidden text-black`}>
        {children}
      </body>
    </html>
  )
}
