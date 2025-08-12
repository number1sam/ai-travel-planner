import './globals.css'

export const metadata = {
  title: 'AI Travel Planning Assistant',
  description: 'Plan your perfect trip with our intelligent travel assistant. Get personalized recommendations for destinations, accommodations, and activities.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body 
        className="antialiased min-h-screen"
        style={{
          backgroundImage: "url('/custom-background.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          backgroundColor: '#f8fafc'
        }}
      >
        {children}
      </body>
    </html>
  )
}
