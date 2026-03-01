import { redirect } from 'next/navigation';

/**
 * Sign-up page — redirects to /signin since auth is social-only.
 * Account creation happens automatically on first OAuth sign-in.
 */
export default function SignUpPage() {
  redirect('/signin');
}
