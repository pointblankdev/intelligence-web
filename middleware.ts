import NextAuth from 'next-auth';

import { authConfig } from '@/app/(auth)/auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    '/',
    '/:id',
    '/api/auth',
    // '/api/chat',
    '/api/document',
    '/api/files',
    '/api/history',
    '/api/suggestions',
    '/login',
    '/register',
  ],
};
