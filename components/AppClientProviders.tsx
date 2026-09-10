"use client";

import React from 'react';
import NextTopLoader from 'nextjs-toploader';
import GlobalErrorBoundary from './globalerrorboundary';
import QueryProvider from './QueryProvider';
import Providers from '../app/providers';
import { ToastProvider } from '@/lib/toast-context'; 
import { ConfirmProvider } from './ConfirmContext'; 
import AutoLogoutWrapper from './AutoLogoutWrapper';
import AuthGuard from "./authGuard"; 
import { PermissionsProvider } from '@/lib/PermissionsContext';
import { SidebarProvider } from '@/lib/SidebarContext'; 
import LayoutClient from './layout/LayoutClient';
import PwaManager from './PwaManager';
import GlobalNavigationShortcuts from './GlobalNavigationShortcuts';
import { THEME } from '@/lib/theme'; 
import { RealtimeSyncProvider } from '@/lib/useRealtimeSync';

export default function AppClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <>
            <NextTopLoader 
                color={THEME.goldAccent} 
                height={3} 
                showSpinner={false} 
                shadow={`0 0 10px ${THEME.goldAccent}`} 
                zIndex={99999} 
            />
            <GlobalErrorBoundary>
                <QueryProvider>
                    <Providers>
                        <ToastProvider>
                            <ConfirmProvider>
                                <AutoLogoutWrapper>
                                    <AuthGuard> 
                                        <PermissionsProvider>
                                            <SidebarProvider> 
                                                <LayoutClient>
                                                    <RealtimeSyncProvider>
                                                    <PwaManager />
                                                    <GlobalNavigationShortcuts />
                                                    <div style={{ position: 'relative', zIndex: 1 }}>
                                                        {children}
                                                    </div>
                                                    </RealtimeSyncProvider>
                                                </LayoutClient>
                                            </SidebarProvider> 
                                        </PermissionsProvider>
                                    </AuthGuard>
                                </AutoLogoutWrapper>
                            </ConfirmProvider>
                        </ToastProvider>
                    </Providers>
                </QueryProvider>
            </GlobalErrorBoundary>
        </>
    );
}
