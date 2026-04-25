'use client';

import { useEffect, useLayoutEffect } from 'react';

const SCROLL_KEY = 'sarec:home-scroll-y';
const RESTORE_KEY = 'sarec:home-should-restore';

function isHomePath(pathname: string) {
  return pathname === '/zh' || pathname === '/zh/';
}

function shouldTrackHref(href: string) {
  const url = new URL(href, window.location.href);

  return (
    url.origin === window.location.origin &&
    url.pathname.startsWith('/zh') &&
    !isHomePath(url.pathname)
  );
}

function saveHomeScrollPosition() {
  sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
  sessionStorage.setItem(RESTORE_KEY, '1');
}

function forceInstantScroll(y: number) {
  const root = document.documentElement;
  const body = document.body;
  const previousRootBehavior = root.style.scrollBehavior;
  const previousBodyBehavior = body.style.scrollBehavior;

  root.style.scrollBehavior = 'auto';
  body.style.scrollBehavior = 'auto';
  window.scrollTo(0, y);
  root.style.scrollBehavior = previousRootBehavior;
  body.style.scrollBehavior = previousBodyBehavior;
}

function getSavedRestoreY() {
  if (sessionStorage.getItem(RESTORE_KEY) !== '1') {
    return null;
  }

  const rawY = sessionStorage.getItem(SCROLL_KEY);
  const y = rawY ? Number.parseInt(rawY, 10) : Number.NaN;

  if (!Number.isFinite(y) || y < 0) {
    sessionStorage.removeItem(SCROLL_KEY);
    sessionStorage.removeItem(RESTORE_KEY);
    return null;
  }

  return y;
}

function restoreHomeScrollPosition() {
  const y = getSavedRestoreY();

  if (y === null) {
    return;
  }

  sessionStorage.removeItem(RESTORE_KEY);

  forceInstantScroll(y);

  requestAnimationFrame(() => forceInstantScroll(y));
  window.setTimeout(() => forceInstantScroll(y), 60);
}

export function HomeScrollRestoration() {
  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    restoreHomeScrollPosition();
  }, []);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as Element | null;
      const anchor = target?.closest<HTMLAnchorElement>('a[href]');

      if (!anchor || anchor.target || anchor.hasAttribute('download')) {
        return;
      }

      if (shouldTrackHref(anchor.href)) {
        saveHomeScrollPosition();
      }
    }

    function handlePageHide() {
      if (isHomePath(window.location.pathname)) {
        sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
      }
    }

    window.addEventListener('click', handleClick, { capture: true });
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('click', handleClick, { capture: true });
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function () {
            try {
              var restoreKey = '${RESTORE_KEY}';
              var scrollKey = '${SCROLL_KEY}';
              var path = window.location.pathname;
              if ((path === '/zh' || path === '/zh/') && sessionStorage.getItem(restoreKey) === '1') {
                var rawY = sessionStorage.getItem(scrollKey);
                var y = rawY ? parseInt(rawY, 10) : NaN;
                if (Number.isFinite(y) && y >= 0) {
                  if ('scrollRestoration' in window.history) {
                    window.history.scrollRestoration = 'manual';
                  }
                  var root = document.documentElement;
                  var body = document.body;
                  var previousRootBehavior = root.style.scrollBehavior;
                  var previousBodyBehavior = body ? body.style.scrollBehavior : '';
                  var instant = function () {
                    root.style.scrollBehavior = 'auto';
                    if (body) body.style.scrollBehavior = 'auto';
                    window.scrollTo(0, y);
                    root.style.scrollBehavior = previousRootBehavior;
                    if (body) body.style.scrollBehavior = previousBodyBehavior;
                  };
                  instant();
                  requestAnimationFrame(instant);
                } else {
                  sessionStorage.removeItem(restoreKey);
                  sessionStorage.removeItem(scrollKey);
                }
              }
            } catch (error) {}
          })();
        `
      }}
    />
  );
}
