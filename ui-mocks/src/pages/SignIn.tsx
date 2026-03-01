import { useNavigate } from 'react-router-dom';

export function SignIn() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-8">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-16">
          <div className="w-16 h-16 mx-auto mb-8 flex items-center justify-center">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path d="M24 4L6 16v16l18 12 18-12V16L24 4z" stroke="#C9A84C" strokeWidth="1.5" fill="none" />
              <circle cx="24" cy="24" r="3" fill="#C9A84C" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold text-text-primary tracking-tight mb-3">
            My<span className="text-gold">Robo</span>Taxi
          </h1>
          <p className="text-text-secondary text-base font-light">Sign in to continue</p>
        </div>

        {/* Auth Buttons — outline style on dark bg */}
        <div className="space-y-3 mb-16">
          {/* Google */}
          <button
            onClick={() => navigate('/home')}
            className="w-full flex items-center justify-center gap-3 border border-border-default rounded-xl py-4 px-6 text-text-primary font-medium hover:bg-bg-surface transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          {/* Apple */}
          <button
            onClick={() => navigate('/home')}
            className="w-full flex items-center justify-center gap-3 border border-border-default rounded-xl py-4 px-6 text-text-primary font-medium hover:bg-bg-surface transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Continue with Apple
          </button>
        </div>
      </div>
    </div>
  );
}
