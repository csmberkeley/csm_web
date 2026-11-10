import { useContext, useEffect, useRef, useState } from "react";
import { UNSAFE_NavigationContext as NavigationContext } from "react-router-dom";

interface BlockedNavigation {
  location: { pathname: string };
  retry: () => void;
}

interface BlockingNavigator {
  block: (blocker: (navigation: BlockedNavigation) => void) => () => void;
  listen: (listener: () => void) => () => void;
}

const withoutTrailingSlash = (path: string) => path.replace(/\/+$/, "");

/**
 * Hook to warn before leaving a page with unsaved changes.
 *
 * While there are unsaved changes, in-app navigation (links and the back button) is held
 * until the user decides, and the browser asks before the tab is closed or reloaded.
 *
 * Relies on the `block` method of the navigator in react-router 6.3;
 * BrowserRouter in later versions doesn't have it, and needs `useBlocker` instead.
 */
export default function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  const navigator = useContext(NavigationContext).navigator as unknown as BlockingNavigator;
  const [blockedNavigation, setBlockedNavigation] = useState<BlockedNavigation | null>(null);
  const unblockRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // later versions of react-router have no `block`; go without the warning instead of crashing
    if (!hasUnsavedChanges || typeof navigator.block !== "function") return;

    let stopWaiting: (() => void) | null = null;

    const handleNavigation = (navigation: BlockedNavigation) => {
      // links to the current page don't lose anything, so let them through
      if (withoutTrailingSlash(navigation.location.pathname) === withoutTrailingSlash(window.location.pathname)) {
        unblockRef.current?.();
        unblockRef.current = null;
        // the back and forward buttons finish asynchronously; blocking again
        // before they land would catch the retry and revert it, over and over
        stopWaiting = navigator.listen(() => {
          stopWaiting?.();
          stopWaiting = null;
          unblockRef.current = navigator.block(handleNavigation);
        });
        navigation.retry();
        return;
      }
      setBlockedNavigation(navigation);
    };

    unblockRef.current = navigator.block(handleNavigation);
    return () => {
      stopWaiting?.();
      unblockRef.current?.();
      unblockRef.current = null;
      setBlockedNavigation(null);
    };
  }, [navigator, hasUnsavedChanges]);

  return {
    showWarning: blockedNavigation !== null,
    stay: () => setBlockedNavigation(null),
    leave: () => {
      unblockRef.current?.();
      unblockRef.current = null;
      blockedNavigation?.retry();
    }
  };
}
