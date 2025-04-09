import '@/styles/globals.css';
import { AuthProvider } from '@/context/AuthContext';

export default function App({ Component, pageProps }) {
  return (
    <div className="min-h-screen">
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </div>
  );
}