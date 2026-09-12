"use client";
import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from '@/components/authGuard';

const PermissionsContext = createContext<any>(null);

export const PermissionsProvider = ({ children }: { children: React.ReactNode }) => {
    const auth = useAuth();
    const profile = auth?.profile;
    const loading = auth?.loading ?? false;

    const role = useMemo(() => {
        if (!profile) return 'client';
        if (profile.is_admin || profile.role === 'super_admin') return 'super_admin';
        return profile.role || 'client';
    }, [profile]);

    const permissions = useMemo(() => {
        return profile?.permissions || {};
    }, [profile]);

    const can = useMemo(() => {
        return (moduleName: string, actionName: string) => {
            if (role === 'super_admin' || role === 'admin') return true;
            const perms = permissions || {};
            if (Array.isArray(perms[moduleName])) {
                return perms[moduleName].includes(actionName);
            } else if (perms[moduleName] && typeof perms[moduleName] === 'object') {
                return perms[moduleName][actionName] === true;
            }
            return false;
        };
    }, [role, permissions]);

    const value = useMemo(() => ({
        can, role, permissions, loading, profile
    }), [can, role, permissions, loading, profile]);

    return (
        <PermissionsContext.Provider value={value}>
            {children}
        </PermissionsContext.Provider>
    );
};

export const usePermissions = () => {
    const context = useContext(PermissionsContext);
    if (!context) {
        return {
            can: () => true,
            role: 'super_admin',
            permissions: {},
            loading: false,
            profile: null
        };
    }
    return context;
};