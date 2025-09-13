import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AppProviders } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Bastion Protocol - Cross-Chain Domain Management',
  description: 'Manage your domains across multiple blockchains with Bastion Protocol',
  keywords: ['blockchain', 'domains', 'cross-chain', 'NFT', 'DeFi'],
  authors: [{ name: 'Bastion Protocol Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
  openGraph: {
    title: 'Bastion Protocol',
    description: 'Cross-Chain Domain Management Platform',
    type: 'website',
    siteName: 'Bastion Protocol',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bastion Protocol',
    description: 'Cross-Chain Domain Management Platform',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={inter.className}>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  )
}