/* Newsletter requests open an email draft; no subscription is claimed locally. */
(() => {
 const status = document.getElementById('footer-status');
 const pageUrl = new URL(window.GearHubTenantStore ? location.pathname : '/', location.origin).href;
 document.querySelector('[data-footer-share="facebook"]').href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(pageUrl);
 document.querySelector('[data-footer-share="telegram"]').href = 'https://t.me/share/url?url=' + encodeURIComponent(pageUrl) + '&text=GearHub%20Spare%20Parts';
 document.getElementById('footer-copy-link').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(pageUrl); status.textContent = tr('footerLinkCopied'); }
  catch { status.textContent = pageUrl; }
 });
 document.getElementById('footer-subscribe-form').addEventListener('submit', event => {
  event.preventDefault();
  const email = document.getElementById('footer-email').value.trim();
  status.textContent = tr('footerEmailDraft');
  const support=window.GearHubTenantStore?config.site?.supportEmail:'info@gearhub.com';
  if(!support){status.textContent='ဆက်သွယ်ရန် email မသတ်မှတ်ရသေးပါ။ / Contact email is not configured.';return;}
  location.href = 'mailto:'+encodeURIComponent(support)+'?subject=' + encodeURIComponent('GearHub newsletter subscription request') + '&body=' + encodeURIComponent('Please subscribe me to GearHub product updates and offers.\nEmail: ' + email);
 });
})();
