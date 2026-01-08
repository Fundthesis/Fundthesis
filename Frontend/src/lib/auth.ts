import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from '@/lib/prisma';
import { getBaseUrl } from '@/lib/getBaseUrl';

// Automatically detect base URL from environment
const baseURL = getBaseUrl();

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
  },
  trustedOrigins: [
    baseURL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    // Allow any subdomain of the base URL
    baseURL.replace(/^https?:\/\/([^.]+)/, 'https://*.$1'),
  ].filter(Boolean),
});
