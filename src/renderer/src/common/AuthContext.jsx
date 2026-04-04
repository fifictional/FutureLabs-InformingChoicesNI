import { createContext, useCallback, useContext, useState } from 'react';

const AuthContext = createContext({ authVersion: 0, refreshAuth: () => {} });

export function AuthProvider({ children }) {
  const [authVersion, setAuthVersion] = useState(0);
  const refreshAuth = useCallback(() => setAuthVersion((v) => v + 1), []);
  return (
    <AuthContext.Provider value={{ authVersion, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
