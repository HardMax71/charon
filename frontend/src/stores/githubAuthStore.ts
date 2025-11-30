import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

interface DeviceFlowState {
  userCode: string;
  verificationUri: string;
  deviceCode: string;
  interval: number;
}

interface GitHubAuthState {
  token: string | null;
  user: GitHubUser | null;
  repos: GitHubRepo[];
  oauthEnabled: boolean | null;
  deviceFlow: DeviceFlowState | null;
  isPolling: boolean;

  checkConfig: () => Promise<boolean>;
  startDeviceFlow: () => Promise<boolean>;
  pollForToken: () => Promise<boolean>;
  cancelDeviceFlow: () => void;
  setTokenAndFetchData: (token: string) => Promise<boolean>;
  restoreSession: () => Promise<void>;
  logout: () => void;
}

export const useGitHubAuth = create<GitHubAuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      repos: [],
      oauthEnabled: null,
      deviceFlow: null,
      isPolling: false,

      checkConfig: async () => {
        try {
          const res = await fetch(`${API_BASE}/auth/github/config`);
          const data = await res.json();
          set({ oauthEnabled: data.enabled });
          return data.enabled;
        } catch {
          set({ oauthEnabled: false });
          return false;
        }
      },

      startDeviceFlow: async () => {
        try {
          const res = await fetch(`${API_BASE}/auth/github/device`, { method: 'POST' });
          if (!res.ok) return false;

          const data = await res.json();
          set({
            deviceFlow: {
              userCode: data.user_code,
              verificationUri: data.verification_uri,
              deviceCode: data.device_code,
              interval: data.interval,
            },
          });

          // Open GitHub auth page
          window.open(data.verification_uri, '_blank');

          return true;
        } catch {
          return false;
        }
      },

      pollForToken: async () => {
        const { deviceFlow } = get();
        if (!deviceFlow) return false;

        set({ isPolling: true });

        const poll = async (): Promise<boolean> => {
          const current = get();
          if (!current.deviceFlow || !current.isPolling) return false;

          try {
            const res = await fetch(`${API_BASE}/auth/github/device/poll`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ device_code: current.deviceFlow.deviceCode }),
            });

            const data = await res.json();

            if (data.status === 'success' && data.access_token) {
              // Fetch user data
              const meRes = await fetch(`${API_BASE}/auth/github/me?token=${data.access_token}`);
              if (meRes.ok) {
                const meData = await meRes.json();
                set({
                  token: data.access_token,
                  user: meData.user,
                  repos: meData.repos,
                  deviceFlow: null,
                  isPolling: false,
                });
                return true;
              }
            } else if (data.status === 'expired' || data.status === 'error') {
              set({ deviceFlow: null, isPolling: false });
              return false;
            }

            // Still pending - poll again
            await new Promise(r => setTimeout(r, current.deviceFlow!.interval * 1000));
            return poll();
          } catch {
            set({ isPolling: false });
            return false;
          }
        };

        return poll();
      },

      cancelDeviceFlow: () => set({ deviceFlow: null, isPolling: false }),

      setTokenAndFetchData: async (token: string) => {
        try {
          const res = await fetch(`${API_BASE}/auth/github/me?token=${token}`);
          if (!res.ok) return false;
          const data = await res.json();
          set({ token, user: data.user, repos: data.repos });
          return true;
        } catch {
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

      logout: () => set({ token: null, user: null, repos: [], deviceFlow: null, isPolling: false }),
    }),
    {
      name: 'gh-auth',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
