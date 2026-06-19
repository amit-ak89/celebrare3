IndexedDB is used because the gallery needs durable client-side storage for structured Picsum image metadata such as id, author, width, height, and download_url. After the first API request succeeds, the same metadata survives reloads and browser restarts, so the app can render from celebrareGalleryDB without immediately hitting the network.

A Map-based memory cache was added for the active session. react-window mounts and unmounts cells while scrolling, and the memory cache keeps already processed metadata available when users return to previous rows. This avoids repeated object work and helps the virtualized grid stay smooth.

Together, the caches improve startup repeat visits, reduce network dependency, and make Chrome DevTools demonstrations clear: first load shows the API request, later offline loads show IndexedDB usage instead.

IndexedDB differs from localStorage because it is asynchronous, transactional, structured, and suited to larger datasets. localStorage is synchronous, string-only, smaller, and can block rendering during reads or writes.
