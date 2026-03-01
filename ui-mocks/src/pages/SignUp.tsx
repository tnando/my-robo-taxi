import { Navigate } from 'react-router-dom';

/**
 * Sign-up page — redirects to sign in since auth is social-only.
 * Account creation happens automatically on first OAuth sign-in.
 */
export function SignUp() {
  return <Navigate to="/" replace />;
}
