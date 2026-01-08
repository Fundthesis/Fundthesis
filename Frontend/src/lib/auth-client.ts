import { createAuthClient } from "better-auth/react";
import { getBaseUrl } from '@/lib/getBaseUrl';

// Automatically detect base URL (will use window.location.origin on client)
const baseURL = getBaseUrl();

export const authClient = createAuthClient({
    baseURL,
});
