import { create } from 'zustand';
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
  user: GitHubUser | null;
  repos: GitHubRepo[];
  clientId: string | null;
  oauthEnabled: boolean | null;
  isAuthenticating: boolean;

  checkConfig: () => Promise<boolean>;
  initiateOAuth: () => void;
  handleOAuthCallback: (code: string) => Promise<boolean>;
  checkSession: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useGitHubAuth = create<GitHubAuthState>()((set, get) => ({
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
    } catch (error) {
      logger.error('Failed to check GitHub OAuth config:', error);
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

    const returnTo = window.location.pathname !== '/' ? window.location.pathname : '';
    if (returnTo) {
      sessionStorage.setItem('oauth_return_to', returnTo);
    }

    const redirectUri = `${window.location.origin}/`;
    const state = crypto.randomUUID();
    sessionStorage.setItem('oauth_state', state);

    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'repo');
    authUrl.searchParams.set('state', state);

    window.location.href = authUrl.toString();
  },

  handleOAuthCallback: async (code: string) => {
    set({ isAuthenticating: true });

    try {
      const res = await fetch(`${API_BASE}/auth/github/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        const error = await res.json();
        logger.error('OAuth callback failed:', error);
        set({ isAuthenticating: false });
        return false;
      }

      const data = await res.json();
      if (data.success) {
        set({ user: data.user, repos: data.repos, isAuthenticating: false });
        return true;
      }

      set({ isAuthenticating: false });
      return false;
    } catch (error) {
      logger.error('OAuth callback error:', error);
      set({ isAuthenticating: false });
      return false;
    }
  },

  checkSession: async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/github/session`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        set({ user: data.user, repos: data.repos });
      } else {
        set({ user: null, repos: [] });
      }
    } catch (error) {
      logger.error('Failed to check session:', error);
      set({ user: null, repos: [] });
    }
  },

  logout: async () => {
    try {
      await fetch(`${API_BASE}/auth/github/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      logger.error('Logout error:', error);
    }
    set({ user: null, repos: [] });
  },
}));
