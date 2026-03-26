
import './globals.css';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { AppShell } from '@/components/layout/app-shell';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap"
            rel="stylesheet"
          />
      </head>
      <body className="font-body h-full">
        <FirebaseClientProvider>
            <AppShell>
              {children}
            </AppShell>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
