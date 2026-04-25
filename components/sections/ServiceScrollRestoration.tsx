'use client';

import { useEffect, useLayoutEffect } from 'react';

type ServiceScrollRestorationProps = {
  pagePath: string;
};

const SCROLL_KEY_PREFIX = 'sarec:service-scroll-y:';
const RESTORE_PATH_KEY = 'sarec:service-restore-path';

function normalizePath(path: string) {
  return path.endsWith('/') ? path : `${path}/`;
}

function forceInstantScroll(y: number) {
  const root = document.documentElement;
  const body = document.body;
  const previousRootBehavior = root.style.scrollBehavior;
  const previousBodyBehavior = body.style.scrollBehavior;

  root.style.scrollBehavior = 'auto';
  body.style.scrollBehavior = 'auto';
  window.scrollTo({ top: y, left: 0, behavior: 'auto' });
  root.style.scrollBehavior = previousRootBehavior;
  body.style.scrollBehavior = previousBodyBehavior;
}

function getScrollKey(pagePath: string) {
  return `${SCROLL_KEY_PREFIX}${normalizePath(pagePath)}`;
}

function saveServiceScrollPosition(pagePath: string) {
  sessionStorage.setItem(getScrollKey(pagePath), String(window.scrollY));
  sessionStorage.setItem(RESTORE_PATH_KEY, normalizePath(pagePath));
}

function shouldTrackHref(href: string, pagePath: string) {
  const url = new URL(href, window.location.href);
  const normalizedCurrentPath = normalizePath(window.location.pathname);
  const normalizedPagePath = normalizePath(pagePath);

  return (
    normalizedCurrentPath === normalizedPagePath &&
    url.origin === window.location.origin &&
    normalizePath(url.pathname) !== normalizedPagePath &&
    url.pathname.startsWith('/zh/')
  );
}

function restoreServiceScrollPosition(pagePath: string) {
  const normalizedPath = normalizePath(pagePath);

  if (normalizePath(window.location.pathname) !== normalizedPath) {
    return;
  }

  if (sessionStorage.getItem(RESTORE_PATH_KEY) !== normalizedPath) {
    return;
  }

  const scrollKey = getScrollKey(normalizedPath);
  const rawY = sessionStorage.getItem(scrollKey);
  const y = rawY ? Number.parseInt(rawY, 10) : Number.NaN;

  if (!Number.isFinite(y) || y < 0) {
    sessionStorage.removeItem(scrollKey);
    sessionStorage.removeItem(RESTORE_PATH_KEY);
    return;
  }

  sessionStorage.removeItem(RESTORE_PATH_KEY);

  forceInstantScroll(y);
  requestAnimationFrame(() => forceInstantScroll(y));
}

export function ServiceScrollRestoration({ pagePath }: ServiceScrollRestorationProps) {
  const normalizedPath = normalizePath(pagePath);
  const scrollKey = getScrollKey(normalizedPath);

  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    restoreServiceScrollPosition(normalizedPath);
  }, [normalizedPath]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as Element | null;
      const anchor = target?.closest<HTMLAnchorElement>('a[href]');

      if (!anchor || anchor.target || anchor.hasAttribute('download')) {
        return;
      }

      if (shouldTrackHref(anchor.href, normalizedPath)) {
        saveServiceScrollPosition(normalizedPath);
      }
    }

    function handlePageHide() {
      if (normalizePath(window.location.pathname) === normalizedPath) {
        sessionStorage.setItem(scrollKey, String(window.scrollY));
      }
    }

    window.addEventListener('click', handleClick, { capture: true });
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('click', handleClick, { capture: true });
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [normalizedPath, scrollKey]);

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function () {
            try {
              var restorePathKey = '${RESTORE_PATH_KEY}';
              var scrollKey = '${scrollKey}';
              var pagePath = '${normalizedPath}';
              var path = window.location.pathname;
              if (path.charAt(path.length - 1) !== '/') path = path + '/';
              if (path === pagePath && sessionStorage.getItem(restorePathKey) === pagePath) {
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
                    window.scrollTo({ top: y, left: 0, behavior: 'auto' });
                    root.style.scrollBehavior = previousRootBehavior;
                    if (body) body.style.scrollBehavior = previousBodyBehavior;
                  };
                  instant();
                  requestAnimationFrame(instant);
                } else {
                  sessionStorage.removeItem(restorePathKey);
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
