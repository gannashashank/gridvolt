import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const isRealSupabase = !!(supabaseUrl && supabaseAnonKey);

// Implement custom MockSupabase for local SQLite backend fallback
class MockSupabaseClient {
  private token: string | null = localStorage.getItem('gv_token');
  private authListeners: ((event: string, session: any) => void)[] = [];
  private eventSource: EventSource | null = null;
  private sseCallbacks: { [channel: string]: { event: string; callback: (payload: any) => void }[] } = {};

  constructor() {
    if (!isRealSupabase) {
      this.initRealtime();
    }
  }

  private initRealtime() {
    if (this.eventSource) return;

    this.eventSource = new EventSource(`${apiBaseUrl}/api/realtime`);

    this.eventSource.addEventListener('ping', () => {
      // Connection alive
    });

    const handleEvent = (type: string, data: any) => {
      Object.keys(this.sseCallbacks).forEach((channelName) => {
        this.sseCallbacks[channelName].forEach(({ event, callback }) => {
          if (event === '*' || event === type) {
            callback({ new: data, old: {}, eventType: 'UPDATE' });
          }
        });
      });
    };

    this.eventSource.addEventListener('provider_update', (e) => {
      handleEvent('provider_update', JSON.parse(e.data));
    });

    this.eventSource.addEventListener('request_new', (e) => {
      handleEvent('request_new', JSON.parse(e.data));
    });

    this.eventSource.addEventListener('request_update', (e) => {
      handleEvent('request_update', JSON.parse(e.data));
    });

    this.eventSource.onerror = () => {
      console.warn('Realtime SSE disconnected. Retrying in 5s...');
      this.eventSource?.close();
      this.eventSource = null;
      setTimeout(() => this.initRealtime(), 5000);
    };
  }

  // Auth mimic
  auth = {
    signUp: async (credentials: any) => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: credentials.options?.data?.name,
            phone: credentials.options?.data?.phone,
            email: credentials.email,
            password: credentials.password,
            role: credentials.options?.data?.role,
            ev_model: credentials.options?.data?.ev_model,
            license_plate: credentials.options?.data?.license_plate,
            vehicle_type: credentials.options?.data?.vehicle_type,
            service_capability: credentials.options?.data?.service_capability,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Signup failed');

        this.setSession(data.token, data.user);
        return { data: { user: data.user, session: { access_token: data.token } }, error: null };
      } catch (err: any) {
        return { data: { user: null, session: null }, error: err };
      }
    },

    signInWithPassword: async (credentials: any) => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');

        this.setSession(data.token, data.user);
        return { data: { user: data.user, session: { access_token: data.token } }, error: null };
      } catch (err: any) {
        return { data: { user: null, session: null }, error: err };
      }
    },

    signOut: async () => {
      this.token = null;
      localStorage.removeItem('gv_token');
      localStorage.removeItem('gv_user');
      this.notifyAuthChange('SIGNED_OUT', null);
      return { error: null };
    },

    getSession: async () => {
      const storedToken = localStorage.getItem('gv_token');
      const storedUser = localStorage.getItem('gv_user');
      if (storedToken && storedUser) {
        return {
          data: {
            session: {
              access_token: storedToken,
              user: JSON.parse(storedUser),
            },
          },
          error: null,
        };
      }
      return { data: { session: null }, error: null };
    },

    getUser: async () => {
      const storedUser = localStorage.getItem('gv_user');
      if (storedUser) {
        return { data: { user: JSON.parse(storedUser) }, error: null };
      }
      return { data: { user: null }, error: null };
    },

    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      this.authListeners.push(callback);
      const storedToken = localStorage.getItem('gv_token');
      const storedUser = localStorage.getItem('gv_user');
      if (storedToken && storedUser) {
        callback('SIGNED_IN', { access_token: storedToken, user: JSON.parse(storedUser) });
      }
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              this.authListeners = this.authListeners.filter((cb) => cb !== callback);
            },
          },
        },
      };
    },
  };

  private setSession(token: string, user: any) {
    this.token = token;
    localStorage.setItem('gv_token', token);
    localStorage.setItem('gv_user', JSON.stringify(user));
    this.notifyAuthChange('SIGNED_IN', { access_token: token, user });
    this.initRealtime();
  }

  private notifyAuthChange(event: string, session: any) {
    this.authListeners.forEach((listener) => listener(event, session));
  }

  // Database operations mapper
  from(table: string) {
    const token = this.token || localStorage.getItem('gv_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const runQuery = async (method: string, body?: any, subPath: string = '') => {
      const url = `${apiBaseUrl}/api/${table}${subPath}`;
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    };

    return {
      select: (columns: string = '*') => {
        return {
          eq: (field: string, value: any) => {
            return {
              single: async () => {
                try {
                  if (table === 'profiles') {
                    // Fetch single profile
                    const resData = await runQuery('GET');
                    const profile = Array.isArray(resData) ? resData.find((p) => p.id === value) : resData;
                    // Mock profile endpoint returns single or object
                    const target = profile.profile || profile;
                    return { data: target, error: null };
                  }
                  if (table === 'assistance_requests') {
                    const data = await runQuery('GET', undefined, `/${value}`);
                    return { data, error: null };
                  }
                  return { data: null, error: new Error('Not implemented') };
                } catch (err: any) {
                  return { data: null, error: err };
                }
              },
              async then(resolve: any) {
                try {
                  const data = await runQuery('GET');
                  const filtered = data.filter((row: any) => row[field] === value);
                  resolve({ data: filtered, error: null });
                } catch (err: any) {
                  resolve({ data: null, error: err });
                }
              },
            };
          },
          async then(resolve: any) {
            try {
              const data = await runQuery('GET');
              resolve({ data, error: null });
            } catch (err: any) {
              resolve({ data: null, error: err });
            }
          },
        };
      },

      insert: (body: any) => {
        return {
          select: () => {
            return {
              async then(resolve: any) {
                try {
                  const data = await runQuery('POST', body);
                  resolve({ data: [data], error: null });
                } catch (err: any) {
                  resolve({ data: null, error: err });
                }
              },
            };
          },
          async then(resolve: any) {
            try {
              const data = await runQuery('POST', body);
              resolve({ data, error: null });
            } catch (err: any) {
              resolve({ data: null, error: err });
            }
          },
        };
      },

      update: (body: any) => {
        return {
          eq: (field: string, value: any) => {
            return {
              async then(resolve: any) {
                try {
                  let data;
                  if (table === 'profiles' && field === 'id') {
                    data = await runQuery('POST', body, '/complete-profile');
                  } else if (table === 'providers' && field === 'profile_id') {
                    data = await runQuery('PUT', body, '/status');
                  } else if (table === 'assistance_requests' && field === 'id') {
                    // Update status
                    data = await runQuery('PUT', { status: body.status }, `/${value}/status`);
                  }
                  resolve({ data, error: null });
                } catch (err: any) {
                  resolve({ data: null, error: err });
                }
              },
            };
          },
        };
      },
    };
  }

  // Realtime subscription mapping
  channel(channelName: string) {
    if (!this.sseCallbacks[channelName]) {
      this.sseCallbacks[channelName] = [];
    }

    return {
      on: (eventType: string, filter: any, callback: (payload: any) => void) => {
        // Map database event names to custom backend sse triggers
        let mappedEvent = '*';
        if (filter?.event === 'UPDATE') {
          mappedEvent = channelName === 'providers' ? 'provider_update' : 'request_update';
        } else if (filter?.event === 'INSERT') {
          mappedEvent = 'request_new';
        }

        this.sseCallbacks[channelName].push({ event: mappedEvent, callback });
        return {
          subscribe: () => {
            console.log(`Subscribed mock realtime on channel: ${channelName} for event: ${mappedEvent}`);
            return {
              unsubscribe: () => {
                this.sseCallbacks[channelName] = this.sseCallbacks[channelName].filter(
                  (cb) => cb.callback !== callback
                );
              },
            };
          },
        };
      },
      subscribe: () => {
        return {
          unsubscribe: () => {},
        };
      },
    };
  }
}

// Export the selected client
export const supabase = isRealSupabase
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (new MockSupabaseClient() as any);
export default supabase;
