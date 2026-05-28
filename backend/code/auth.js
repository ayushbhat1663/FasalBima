/* ══════════════════════════════════════════
   AUTHENTICATION LOGIC (Backend Integrated)
══════════════════════════════════════════ */
let authEmail = '';
let authTimerInterval = null;
let isResending = false;

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:10000' 
  : 'https://ai-crop-project-1-acr6.onrender.com';

/* ══════════════════════════════════════════
   ACTIONS
══════════════════════════════════════════ */

async function authSendOTP() {
  console.log("▶️ Debug: Send OTP clicked (API)");
  
  const emailInput = document.getElementById('authEmailInput');
  const btn = document.getElementById('authSendOTPBtn');
  const btnText = document.getElementById('authSendBtnText');
  
  if (!emailInput) {
      console.warn("⚠️ Debug: Missing email input DOM element");
      return;
  }
  
  authEmail = emailInput.value.trim();
  
  if (!authEmail || !authEmail.includes('@')) {
    showAuthError('authEmailError', t('invalid_email_msg') || 'Invalid email');
    emailInput.classList.add('error');
    if (btn) btn.disabled = false;
    return;
  }
  
  emailInput.classList.remove('error');
  
  // Set loading state
  if (btn) btn.disabled = true;
  if (btnText) btnText.innerHTML = `<span class="auth-spinner"></span> ${t('sending_otp_btn') || 'Sending...'}...`;
  
  try {
    const response = await fetch(`${API_URL}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: authEmail })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ OTP Sent successfully');
      authShowOTPPhase();
      startAuthTimer(300); // 5 minutes
    } else {
      showAuthError('authEmailError', data.message || 'Failed to send OTP');
    }
  } catch (error) {
    console.error('❌ Fetch Error:', error);
    showAuthError('authEmailError', 'Server connection failed');
  } finally {
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = t('send_otp') || 'Send OTP';
  }
}

async function authVerifyOTP() {
  const btn = document.getElementById('authVerifyBtn');
  const btnText = document.getElementById('authVerifyBtnText');
  const errorEl = document.getElementById('authOTPError');
  const successEl = document.getElementById('authOTPSuccess');
  const inputs = document.querySelectorAll('.otp-digit');
  
  if (errorEl) errorEl.classList.remove('show');
  
  let otp = '';
  inputs.forEach(inp => otp += inp.value);
  
  if (otp.length !== 6) {
    showAuthError('authOTPError', t('enter_otp_msg'));
    return;
  }
  
  btn.disabled = true;
  btnText.innerHTML = `<span class="auth-spinner"></span> ${t('verifying_btn')}...`;
  

  try {
    const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: authEmail, otp: otp })
    });

    const data = await response.json();

    if (data.success) {
      console.log("✅ Auth Success! Redirecting...");
      
      if (successEl) {
          successEl.textContent = t('login_success_msg') || 'Login Successful!';
          successEl.classList.add('show');
      }
      
      if (btnText) btnText.textContent = t('login_success_msg') || 'Login Successful!';
      if (authTimerInterval) clearInterval(authTimerInterval);

      // Save Session Data
      storage.set('fasalbima_token', data.token);
      storage.set('userEmail', authEmail); 
      storage.set('isLoggedIn', 'true');

      // Navigation
      setTimeout(() => {
        const adminEmail = '2022a1r030@mietjammu.in';
        if (authEmail === adminEmail) {
          if (typeof goTo === 'function') goTo('screen-admin');
          else window.location.reload();
        } else {
          if (typeof goTo === 'function') {
            goTo('screen-language');
          } else {
            window.location.reload();
          }
        }
      }, 800);
    } else {
      showAuthError('authOTPError', data.message || 'Invalid OTP');
    }
  } catch (error) {
    console.error('❌ Verify Error:', error);
    showAuthError('authOTPError', 'Verification failed');
  } finally {
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = t('verify_btn') || 'Verify & Login';
  }
}

async function authResendOTP() {
  if (isResending) return;
  isResending = true;
  console.log("🚀 Resending OTP via API...");
  
  try {
    const response = await fetch(`${API_URL}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: authEmail })
    });

    const data = await response.json();

    if (data.success) {
      const successEl = document.getElementById('authOTPSuccess');
      if (successEl) {
        successEl.textContent = t('otp_sent_alert');
        successEl.classList.add('show');
        setTimeout(() => successEl.classList.remove('show'), 3000);
      }
      startResendCooldown(60, 'authResendBtn', 'resendBtnText');
      startAuthTimer(300);
    } else {
      showAuthError('authOTPError', data.message || 'Resend failed');
    }
  } catch (err) {
    showAuthError('authOTPError', 'Resend failed');
  } finally {
    isResending = false;
  }
}

function authLogout() {
  storage.remove('fasalbima_token');
  storage.remove('userEmail');
  storage.remove('isLoggedIn');
  storage.remove('fasalbima_lang');
  window.location.href = window.location.pathname || '/';
}

/* ══════════════════════════════════════════
   UI HELPERS
══════════════════════════════════════════ */

function authShowEmailPhase() {
  const p1 = document.getElementById('authEmailPhase'), p2 = document.getElementById('authOTPPhase');
  if (p1) p1.style.display = 'block';
  if (p2) p2.style.display = 'none';
  if (authTimerInterval) clearInterval(authTimerInterval);
}

function authShowOTPPhase() {
  const p1 = document.getElementById('authEmailPhase'), p2 = document.getElementById('authOTPPhase'), display = document.getElementById('authEmailDisplay');
  if (p1) p1.style.display = 'none';
  if (p2) p2.style.display = 'block';
  if (display) display.textContent = authEmail;
  document.querySelectorAll('.otp-digit').forEach(el => { el.value = ''; el.classList.remove('filled'); });
  const otp1 = document.getElementById('otp1');
  if (otp1) otp1.focus();
}

function showAuthError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 5000);
}

function initOTPInputs() {
  const inputs = document.querySelectorAll('.otp-digit');
  inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      if (e.target.value.length === 1) {
        input.classList.add('filled');
        if (index < inputs.length - 1) inputs[index + 1].focus();
      } else { input.classList.remove('filled'); }
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && index > 0) inputs[index - 1].focus();
    });
  });
}

function startAuthTimer(seconds) {
  if (authTimerInterval) clearInterval(authTimerInterval);
  const display = document.getElementById('authCountdown');
  if (!display) return;
  let timer = seconds;
  authTimerInterval = setInterval(() => {
    const mins = Math.floor(timer / 60), secs = timer % 60;
    display.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    if (--timer < 0) { 
        clearInterval(authTimerInterval); 
        display.textContent = t('expired_msg') || 'Expired'; 
    }
  }, 1000);
}

function startResendCooldown(seconds, btnId, textId) {
  const btn = document.getElementById(btnId), text = document.getElementById(textId);
  if (!btn || !text) return;
  
  let countdown = seconds;
  btn.disabled = true;
  btn.style.opacity = '0.6';
  
  const interval = setInterval(() => {
    text.textContent = `${t('wait_msg') || 'Wait'} (${countdown}s)`;
    if (--countdown < 0) {
      clearInterval(interval);
      btn.disabled = false;
      btn.style.opacity = '1';
      text.textContent = t('resend_otp') || 'Resend OTP';
    }
  }, 1000);
}

document.addEventListener('DOMContentLoaded', initOTPInputs);
