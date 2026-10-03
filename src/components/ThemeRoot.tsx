import { ThemeProvider } from "next-themes";
import { useLocation } from "react-router-dom";

export function ThemeRoot({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="concreart-theme"
      forcedTheme={pathname === "/login" ? "light" : undefined}
    >
      {children}
    </ThemeProvider>
  );
}
