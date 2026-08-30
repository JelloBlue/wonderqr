import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

async function loadDashboard() {
  if (!token) {
    document.getElementById('dashboard-subtitle').innerText = "Access Denied: Missing auth token.";
    return;
  }

  const ownerSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { 'x-owner-token': token } }
  });

  const { data: feedbackData, error } = await ownerSupabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !feedbackData) {
    document.getElementById('dashboard-subtitle').innerText = "Unauthorized or no feedback found.";
    return;
  }

  document.getElementById('dashboard-subtitle').innerText = `Total Complaints: ${feedbackData.length}`;
  const listContainer = document.getElementById('feedback-list');

  if (feedbackData.length === 0) {
    listContainer.innerHTML = "<p>No negative feedback reported yet!</p>";
    return;
  }

  listContainer.innerHTML = feedbackData.map(item => `
    <div class="feedback-card">
      <div class="feedback-stars">${'★'.repeat(item.rating)}${'☆'.repeat(5 - item.rating)}</div>
      <div class="feedback-date">${new Date(item.created_at).toLocaleDateString()}</div>
      <div class="feedback-msg">${item.message || '<em>No written message provided</em>'}</div>
    </div>
  `).join('');
}

loadDashboard();
