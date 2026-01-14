import React from "react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ExternalAuthProvider } from "@/components/context/ExternalAuthContext";
import { Toaster } from 'react-hot-toast';
import LayoutContent from "@/components/layout/LayoutContent";

export default function Layout({ children, currentPageName }) {
  return (
    <ExternalAuthProvider>
      <ThemeProvider>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'hsl(var(--card))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
            }}
          />
          <LayoutContent currentPageName={currentPageName}>
                    {children}
                  </LayoutContent>
                </ThemeProvider>
              </ExternalAuthProvider>
          );
          }