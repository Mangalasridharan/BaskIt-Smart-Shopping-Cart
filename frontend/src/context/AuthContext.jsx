import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import axiosInstance from "../utils/axiosInstance";

const AuthContext = createContext(null);

const TOKEN_KEY = "token";
const UNAUTHORIZED_EVENT = "baskit:unauthorized";

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
        setLoading(false);
    }, []);

    const startSession = useCallback((data) => {
        if (!data?.accessToken || !data?.user) {
            throw new Error("The server did not return a valid session.");
        }

        localStorage.setItem(TOKEN_KEY, data.accessToken);
        setToken(data.accessToken);
        setUser(data.user);
        setLoading(false);
        return data.user;
    }, []);

    const login = useCallback(async (email, password) => {
        const response = await axiosInstance.post("/customer/login", { email, password });

        if (response.data?.error) {
            throw new Error(response.data.message || "Invalid email or password");
        }

        return startSession(response.data);
    }, [startSession]);

    const register = useCallback(async ({ fullName, email, password, role, store }) => {
        const response = await axiosInstance.post("/customer/register", {
            fullName,
            email,
            password,
            role,
            store,
        });

        if (response.data?.error) {
            throw new Error(response.data.message || "Registration failed");
        }

        return startSession(response.data);
    }, [startSession]);

    const loginWithGoogle = useCallback(async ({ idToken, role, store }) => {
        const response = await axiosInstance.post("/customer/google", {
            idToken,
            role,
            store,
        });

        if (response.data?.error) {
            throw new Error(response.data.message || "Google authentication failed");
        }

        return startSession(response.data);
    }, [startSession]);

    // Rehydrate the session from the JWT whenever the app loads or the token changes.
    useEffect(() => {
        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }

        if (user) {
            setLoading(false);
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const response = await axiosInstance.get("/customer/me");
                if (!cancelled) {
                    if (response.data?.user) {
                        setUser(response.data.user);
                    } else {
                        logout();
                    }
                }
            } catch (error) {
                if (!cancelled) {
                    console.warn("Could not restore session:", error.response?.data?.message || error.message);
                    logout();
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [token, user, logout]);

    // The axios interceptor fires this event on a 401 so any expired token is cleared.
    useEffect(() => {
        const handleUnauthorized = () => logout();
        window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
        return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    }, [logout]);

    const value = useMemo(
        () => ({
            user,
            token,
            loading,
            isAuthenticated: Boolean(token && user),
            login,
            loginWithGoogle,
            register,
            logout,
        }),
        [user, token, loading, login, loginWithGoogle, register, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used inside an AuthProvider");
    }
    return context;
};
