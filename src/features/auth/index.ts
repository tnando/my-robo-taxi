/**
 * Auth feature — public API.
 * Only export what app/ pages and other features need.
 */

// Components
export { SignInForm } from './components/SignInForm';

// Hooks
export { useAuth } from './hooks/use-auth';

// Types
export type { AuthProvider, AuthUser, AuthStatus } from './types';
