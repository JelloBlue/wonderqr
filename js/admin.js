import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const urlParams = new URLSearchParams(window.location.search);
let token = urlParams.get('token');

// 1. Storage Handling: Save token to localStorage if present in URL
if (token) {
  localStorage.setItem('admin_auth_token', token);
} else {
  // If launching PWA without URL params, retrieve saved token from localStorage
  token = localStorage.getItem('admin_auth_token');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function loadDashboard() {
  const subtitleEl = document.getElementById('dashboard-subtitle');
  const listContainer = document.getElementById('feedback-list');

  if (!token) {
    if (subtitleEl) subtitleEl.innerText = "Access Denied: Missing auth token. Please open your unique dashboard link first.";
    return;
  }

  // 2. Authenticate owner token and retrieve the specific business record
  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .select('id, business_name')
    .eq('auth_token', token)
    .single();

  if (bizError || !business) {
    console.error("Authentication Error:", bizError);
    if (subtitleEl) subtitleEl.innerText = "Unauthorized: Invalid business token.";
    // Clear invalid token if stored
    localStorage.removeItem('admin_auth_token');
    return;
  }

  // Dynamically update header if title element exists in HTML
  const bizTitleEl = document.getElementById('business-title');
  if (bizTitleEl) bizTitleEl.innerText = business.business_name;

  // 3. Fetch feedback ONLY for this specific business ID (Prevents cross-talk bug)
  const { data: feedbackData, error: fbError } = await supabase
    .from('feedback')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false });

  if (fbError) {
    console.error("Error fetching feedback:", fbError);
    if (subtitleEl) subtitleEl.innerText = "Error loading private feedback.";
    return;
  }

  const feedbacks = feedbackData || [];

  if (subtitleEl) subtitleEl.innerText = `Total Complaints: ${feedbacks.length}`;

  if (feedbacks.length === 0) {
    if (listContainer) listContainer.innerHTML = "<p>No negative feedback reported yet!</p>";
    return;
  }

  // 4. Render private feedback cards safely
  if (listContainer) {
    listContainer.innerHTML = feedbacks.map(item => `
      <div class="feedback-card">
        <div class="feedback-stars">${'★'.repeat(item.rating || 0)}${'☆'.repeat(5 - (item.rating || 0))}</div>
        <div class="feedback-date">${new Date(item.created_at).toLocaleDateString()}</div>
        <div class="feedback-msg">${item.message ? item.message : '<em>No written message provided</em>'}</div>
        ${item.customer_phone ? `<div class="feedback-contact"><strong>Contact:</strong> ${item.customer_phone}</div>` : ''}
      </div>
    `).join('');
  }
}

loadDashboard();
