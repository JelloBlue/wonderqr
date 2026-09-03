// Super Admin: convert generated copy-link actions into real link-opening buttons.
// Uses capture-phase delegation so any older copy-link handler cannot intercept the click.
(() => {
  const getType = btn => {
    const text = (btn.textContent || '').trim().toLowerCase();
    if (text.includes('customer')) return 'customer';
    if (text.includes('admin')) return 'admin';
    if (text.includes('sales') || text === 'copy link') return 'sales';
    return null;
  };

  function prepare(btn) {
    if (!btn || btn.dataset.directOpen === '1') return;
    const type = getType(btn);
    const url = btn.getAttribute('data-copy');
    if (!type || !url) return;

    btn.removeAttribute('data-copy');
    btn.dataset.directOpen = '1';
    btn.dataset.openUrl = url;
    btn.classList.remove('btn-copy');
    btn.textContent = type === 'customer' ? 'Customer Rating Link' : type === 'admin' ? 'Admin Link' : 'Sales Link';
    btn.title = 'Open link in a new tab';
  }

  function prepareAll() {
    document.querySelectorAll('[data-copy]').forEach(prepare);
  }

  // Capture phase runs before the old document-level copy handler.
  document.addEventListener('click', event => {
    const btn = event.target.closest('[data-direct-open], [data-copy]');
    if (!btn) return;
    const type = getType(btn);
    const url = btn.dataset.openUrl || btn.getAttribute('data-copy');
    if (!type || !url) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  }, true);

  const observer = new MutationObserver(prepareAll);
  observer.observe(document.body, { childList: true, subtree: true });
  prepareAll();
  setTimeout(prepareAll, 100);
  setTimeout(prepareAll, 500);
  setTimeout(prepareAll, 1500);
})();
