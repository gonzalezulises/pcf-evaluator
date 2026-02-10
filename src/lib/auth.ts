import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { getDb } from './db';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const sql = getDb();
        const rows = await sql`
          SELECT id, email, name, password_hash, role, is_active
          FROM users WHERE email = ${credentials.email as string}
        `;

        const user = rows[0];
        if (!user || !user.is_active) return null;

        const valid = await compare(
          credentials.password as string,
          user.password_hash as string
        );
        if (!valid) return null;

        return {
          id: String(user.id),
          email: user.email as string,
          name: user.name as string,
          role: user.role as string,
        };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
