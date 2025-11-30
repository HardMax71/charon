import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { logger } from '@/utils/logger';

const API_BASE = '/api';

interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
}

interface GitHubRepo {
  full_name: string;
  private: boolean;
  default_branch: string;
}

interface GitHubAuthState {
  token: string | null;
  user: GitHubUser | null;
  repos: GitHubRepo[];
  clientId: string | null;
  oauthEnabled: boolean | null;
  isAuthenticating: boolean;

  // OAuth Web Flow
  checkConfig: () => Promise<boolean>;
  initiateOAuth: () => void;
  handleOAuthCallback: (code: string) => Promise<boolean>;

  // Session management
  restoreSession: () => Promise<void>;
  logout: () => void;
}

export const useGitHubAuth = create<GitHubAuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      repos: [],
      clientId: null,
      oauthEnabled: null,
      isAuthenticating: false,

      checkConfig: async () => {
        try {
          const res = await fetch(`${API_BASE}/auth/github/config`);
          const data = await res.json();
          set({ oauthEnabled: data.enabled, clientId: data.client_id });
          return data.enabled;
        } catch {
          set({ oauthEnabled: false });
          return false;
        }
      },

      initiateOAuth: () => {
        const { clientId } = get();
        if (!clientId) {
          logger.error('GitHub OAuth not configured');
          return;
        }

        // Store current URL to return to after OAuth (if not home)
        const returnTo = window.location.pathname !== '/' ? window.location.pathname : '';
        if (returnTo) {
          sessionStorage.setItem('oauth_return_to', returnTo);
        }

        // Redirect to GitHub OAuth
        const redirectUri = `${window.location.origin}/`;
        const scope = 'repo'; // Access to public and private repos
        const state = crypto.randomUUID(); // CSRF protection
        sessionStorage.setItem('oauth_state', state);

        const authUrl = new URL('https://github.com/login/oauth/authorize');
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('scope', scope);
        authUrl.searchParams.set('state', state);

        window.location.href = authUrl.toString();
      },

      handleOAuthCallback: async (code: string) => {
        set({ isAuthenticating: true });

        try {
          // Exchange code for token via backend
          const tokenRes = await fetch(`${API_BASE}/auth/github/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          });

          if (!tokenRes.ok) {
            const error = await tokenRes.json();
            logger.error('Token exchange failed:', error);
            set({ isAuthenticating: false });
            return false;
          }

          const tokenData = await tokenRes.json();
          const accessToken = tokenData.access_token;

          // Fetch user data and repos
          const meRes = await fetch(`${API_BASE}/auth/github/me?token=${accessToken}`);
          if (!meRes.ok) {
            logger.error('Failed to fetch user data');
            set({ isAuthenticating: false });
            return false;
          }

          const meData = await meRes.json();
          set({
            token: accessToken,
            user: meData.user,
            repos: meData.repos,
            isAuthenticating: false,
          });

          return true;
        } catch (error) {
          logger.error('OAuth callback error:', error);
          set({ isAuthenticating: false });
          return false;
        }
      },

      restoreSession: async () => {
        const token = get().token;
        if (!token) return;

        try {
          const res = await fetch(`${API_BASE}/auth/github/me?token=${token}`);
          if (res.ok) {
            const data = await res.json();
            set({ user: data.user, repos: data.repos });
          } else {
            set({ token: null, user: null, repos: [] });
          }
        } catch {
          set({ token: null, user: null, repos: [] });
        }
      },

      logout: () => set({ token: null, user: null, repos: [] }),
    }),
    {
      name: 'gh-auth',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
