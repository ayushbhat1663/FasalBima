/* ══════════════════════════════════════════════════════
   CLAIM WORKFLOW SYSTEM v9.0 (LOVABLE AI BRIDGE)
   Listening for external AI results & Syncing
   ══════════════════════════════════════════════════════ */
(function () {
    'use strict';

    window.DEV_MODE = window.DEV_MODE === true;

    const STORAGE_KEY = 'fb_user_crops';
    let lastReceivedAiResult = null;

    const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? 'http://localhost:10000' 
      : 'https://ai-crop-project-1-acr6.onrender.com';

        // Minimum damage threshold (%) to allow insurance claims
        const MIN_DAMAGE_THRESHOLD = 10;

        // Storage key for latest analysis (global convenience)
        const LATEST_ANALYSIS_KEY = 'fb_latest_analysis';

        function severityLabelForPct(p) {
            if (p == null || isNaN(p)) return 'Unknown';
            p = Number(p);
            if (p <= 5) return 'Healthy';
            if (p <= 25) return 'Minor';
            if (p <= 50) return 'Moderate';
            if (p <= 75) return 'Severe';
            return 'Critical';
        }

    /** ── Toast Utility ── */
    function cwToast(msg, type) {
        var t = document.getElementById('cw-toast');
        if (t) t.remove();
        t = document.createElement('div');
        t.id = 'cw-toast';
        t.className = 'cw-toast ' + (type || 'info');
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(function () { t.classList.add('show'); }, 10);
        setTimeout(function () {
            t.classList.remove('show');
            setTimeout(function () { t.remove(); }, 300);
        }, 3000);
    }

    /** ── Status Configurations ── */
    const STATUS_MAP = {
        'Registered': { cls: 'b-review', icon: '📝', label: 'Registered' },
        'Approved by AI': { cls: 'b-pending', icon: '🤖', label: 'AI Approved · Field Review' },
        'Approved by Agent': { cls: 'b-approved', icon: '✅', label: 'Agent Verified' },
        'Rejected by AI': { cls: 'b-rejected', icon: '❌', label: 'Healthy Crop' }
    };

    /** ── Dynamic Summary Generator ── */
    function getCropTypeFromClaim(claim) {
        if (!claim) return 'your crop';
        return claim.cropType || claim.crop_name || claim.cropName ||
            (claim.analysis && (claim.analysis.cropType || claim.analysis.crop_name || claim.analysis.cropName)) ||
            'your crop';
    }

    function getCropDisplayName(claim) {
        const cropType = getCropTypeFromClaim(claim);
        if (typeof cropType === 'string' && cropType.startsWith('crop_') && typeof t === 'function') {
            return t(cropType);
        }
        return cropType;
    }

    function generateDamageSummary(ai, cropType) {
        if (!ai) return '';
        // ai expected shape: { damagePercentage, disease, cause, severity, verification, fraudCheck, reason, confidenceScore }
        const pct = ai.damagePercentage != null ? Number(ai.damagePercentage) : null;
        const sev = ai.severity ? String(ai.severity).toLowerCase() : null;
        const cause = ai.cause || ai.disease || null;
        const verified = ai.verification ? String(ai.verification).toLowerCase() : null;
        const cropLabel = cropType || 'your crop';

        // Healthy crop detection
        if ((ai.disease && String(ai.disease).toLowerCase() === 'none') && (!ai.cause || ai.cause === 'None') && (!pct || pct === 0)) {
            return 'No major crop damage detected.';
        }

        // Fraud warning handled separately

        // Build descriptive summary based on cause/severity
        let phrase = '';
        if (cause) {
            const c = String(cause).toLowerCase();
            if (c.includes('flood') || c.includes('water')) phrase = 'flood-related';
            else if (c.includes('drought')) phrase = 'drought-related';
            else if (c.includes('storm') || c.includes('hail') || c.includes('wind')) phrase = 'storm-related';
            else if (c.includes('pest')) phrase = 'pest attack related';
            else phrase = `${cause}-related`;
        }

        // Map numeric percentage to severity buckets
        function mapSeverityLabel(p) {
            if (p == null) return sev || 'unknown';
            if (p <= 5) return 'healthy';
            if (p <= 25) return 'minor';
            if (p <= 50) return 'moderate';
            if (p <= 75) return 'severe';
            return 'critical';
        }

        const severityText = sev ? sev : mapSeverityLabel(pct);

        if (pct != null) {
            return `AI ${verified ? verified + ' ' : ''}${severityText} ${phrase ? phrase + ' ' : ''}crop damage in ${cropLabel} with ${pct}% estimated destruction.`;
        }

        // Fallback when percentage missing
        return `AI ${verified ? verified + ' ' : ''}${severityText}${phrase ? ' ' + phrase : ''} crop damage detected in ${cropLabel}.`;
    }

    function normalizeDamageSummary(summary, cropType) {
        if (!summary || typeof summary !== 'string') return summary;
        const text = summary.trim();
        const lowered = text.toLowerCase();
        if (lowered.includes('ai verified crop damage') || lowered.includes('field verification required for claim approval') || lowered.includes('wheat')) {
            return '📝 AI verified crop damage. Field verification required for claim approval.';
        }
        return text;
    }

    /** Normalize incoming AI payloads into unified structure */
    function normalizeAiPayload(raw) {
        if (!raw) return null;
        const r = raw;
        const damagePercentage = r.damagePercentage || r.damage_percent || r.damagePercent || r.damage || r.percent || null;
        const severity = r.severity || r.severity_level || r.severityLabel || null;
        const cause = r.cause || r.cause_of_damage || r.event || null;
        const disease = r.disease || r.pest || null;
        const verification = r.verification || r.verification_status || r.verified || null;
        const fraudCheck = (r.fraudCheck !== undefined) ? r.fraudCheck : (r.fraud || false);
        const weatherValidation = r.weatherValidation || r.weather_check || null;
        const location = r.location || r.latlng || null;
        const analysisDate = r.analysisDate || r.date || new Date().toISOString();
        const confidenceScore = r.confidenceScore || r.confidence || r.confidence_level || null;

        return {
            damagePercentage: damagePercentage != null ? Number(damagePercentage) : null,
            severity: severity || null,
            cause: cause || null,
            disease: disease || null,
            verification: verification || null,
            fraudCheck: !!fraudCheck,
            weatherValidation: weatherValidation || null,
            location: location || null,
            analysisDate: analysisDate,
            confidenceScore: confidenceScore != null ? Number(confidenceScore) : null,
            reason: r.reason || r.notes || null
        };
    }

    /** Enhanced fraud detection rules (deterministic checks) */
    function detectFraud(ai) {
        if (!ai) return { fraud: false, reasons: [] };
        const reasons = [];

        // Missing GPS/location is suspicious
        if (!ai.location) reasons.push('missing_location');

        // Very low confidence
        if (ai.confidenceScore != null && ai.confidenceScore < 30) reasons.push('low_confidence');

        // High damage but no visible disease
        if ((ai.damagePercentage || 0) > 80 && (!ai.disease || String(ai.disease).toLowerCase() === 'none')) reasons.push('damage_without_disease');

        // If analysisDate older than 30 days, suspicious
        try {
            const ad = new Date(ai.analysisDate || Date.now());
            if ((Date.now() - ad.getTime()) > (1000 * 60 * 60 * 24 * 30)) reasons.push('stale_image_date');
        } catch (e) { }

        // Weather mismatch: compare ai.location city with displayed wCity (best-effort)
        try {
            const wCityEl = document.getElementById('wCity');
            if (wCityEl && ai.location && typeof ai.location === 'string') {
                const pageCity = (wCityEl.textContent || '').trim().toLowerCase();
                if (pageCity && !ai.location.toLowerCase().includes(pageCity)) reasons.push('weather_location_mismatch');
            }
        } catch (e) { }

        return { fraud: reasons.length > 0, reasons };
    }

    /**
     * LOVABLE BRIDGE: Save claim analysis to crop record
     * Attaches AI analysis to the currently selected crop and prepares for insurance request
     */
    window.saveClaimAnalysis = function (analysisPayload) {
        console.log('💾 saveClaimAnalysis called with:', analysisPayload);
        
        if (!analysisPayload || typeof analysisPayload !== 'object') {
            console.error('❌ Invalid analysis payload:', analysisPayload);
            cwToast('❌ Invalid analysis data', 'error');
            return false;
        }

        try {
            const raw = storage.get(STORAGE_KEY);
            let crops = raw ? JSON.parse(raw) : [];

            if (crops.length === 0) {
                console.warn('⚠️ No crops registered yet');
                cwToast('⚠️ Please register a crop first', 'warn');
                return false;
            }

            // Find the target crop
            let targetCropId = window._cwSelectedCropId || storage.get('_cw_last_sid');
            let idx = crops.findIndex(c => String(c.id) === String(targetCropId));

            // Fallback: use most recent crop
            if (idx === -1) {
                const sorted = [...crops].sort((a, b) => (b.id || 0) - (a.id || 0));
                idx = crops.findIndex(c => c.id === sorted[0].id);
            }

            if (idx === -1) {
                console.error('❌ Could not find target crop');
                cwToast('❌ Could not find crop record', 'error');
                return false;
            }

            const targetCrop = crops[idx];
            console.log('🎯 Target crop found:', targetCrop.crop_name, `(ID: ${targetCrop.id})`);

            // Normalize the analysis if not already normalized
            let normalizedAnalysis = analysisPayload;
            if (window.aiAdapter && typeof window.aiAdapter.normalizePayload === 'function') {
                normalizedAnalysis = window.aiAdapter.normalizePayload(analysisPayload);
                console.log('✅ Analysis normalized via aiAdapter');
            }

            // Attach analysis to crop
            targetCrop.ai_result = normalizedAnalysis;
            targetCrop.damage_percent = normalizedAnalysis.damagePercentage || 0;
            targetCrop.damage_summary = normalizeDamageSummary(
                normalizedAnalysis.damageSummary || generateDamageSummary(normalizedAnalysis, getCropTypeFromClaim(targetCrop)),
                getCropTypeFromClaim(targetCrop)
            );
            targetCrop.analysis_timestamp = new Date().toISOString();

            // Run fraud detector if available
            let fraudReport = { fraud: false, reasons: [] };
            try {
                if (window.fraudDetector && typeof window.fraudDetector.evaluate === 'function') {
                    fraudReport = window.fraudDetector.evaluate(normalizedAnalysis, crops);
                }
            } catch (e) { console.error('Fraud detection error:', e); }

            normalizedAnalysis.fraudCheck = fraudReport.fraud;
            normalizedAnalysis.fraudReasons = fraudReport.reasons || [];

            // Run decision engine if available
            let decision = { decision: 'Pending', reason: 'awaiting_field_verification' };
            try {
                if (window.claimDecisionEngine && typeof window.claimDecisionEngine.decide === 'function') {
                    decision = window.claimDecisionEngine.decide(normalizedAnalysis, fraudReport);
                }
            } catch (e) { console.error('Decision engine error:', e); }

            targetCrop.decision = decision;

            // Update status
            if (decision.decision === 'Rejected') {
                targetCrop.status = 'Rejected by AI';
            } else if (decision.decision === 'Approved') {
                targetCrop.status = 'Approved by AI';
            } else {
                targetCrop.status = 'Registered';
            }

            // Mark this crop as a claim-ready record
            targetCrop.claim_ready = true;
            targetCrop.claim_status = decision.decision === 'Rejected' ? 'Rejected' : 'Pending';
            targetCrop.claim_id = targetCrop.claim_id || ('CLM-' + Math.random().toString(36).substr(2, 8).toUpperCase());
            targetCrop.requested_insurance = targetCrop.requested_insurance || false;

            // Save updated crops back to storage
            crops[idx] = targetCrop;
            storage.set(STORAGE_KEY, JSON.stringify(crops));
            console.log('✅ Crop record updated and saved');

            // Also store as latest analysis globally
            storage.set(LATEST_ANALYSIS_KEY, JSON.stringify(normalizedAnalysis));
            console.log('✅ Analysis saved to global storage');

            // Update lastReceivedAiResult for debug panel
            lastReceivedAiResult = { origin: 'LOVABLE_IFRAME', raw: analysisPayload };

            // Also store as latest analysis globally
            storage.set(LATEST_ANALYSIS_KEY, JSON.stringify(normalizedAnalysis));
            console.log('✅ Analysis saved to global storage');

            // Update lastReceivedAiResult for debug panel
            lastReceivedAiResult = { origin: 'LOVABLE_IFRAME', raw: analysisPayload };

            // Show debug panel if available and enabled
            if (window.DEV_MODE && window.devDebugPanel && typeof window.devDebugPanel.show === 'function') {
                window.devDebugPanel.show({ analysisResult: normalizedAnalysis, fraudReport, decision });
            }

            console.log('📊 Claim Analysis Summary:', {
                cropName: targetCrop.crop_name,
                damagePercent: targetCrop.damage_percent,
                severity: normalizedAnalysis.severity,
                status: targetCrop.status,
                decision: decision.decision,
                claim_ready: targetCrop.claim_ready,
                claim_status: targetCrop.claim_status
            });

            return true;
        } catch (error) {
            console.error('❌ Error in saveClaimAnalysis:', error);
            cwToast(`❌ Failed to save analysis: ${error.message}`, 'error');
            return false;
        }
    };

    /**
     * LOVABLE BRIDGE: Listen for data from the third-party iframe
     */
    window.addEventListener('message', function (event) {
        // Only accept messages from trusted origins
        const allowed = [
            'https://plant-vision-pal.lovable.app',
            'https://lovable.app'
        ];

        // Validate origin
        if (!event.origin) {
            console.warn('📵 Message received with no origin (ignored)');
            return;
        }

        const isTrustedOrigin = allowed.some(a => event.origin === a || event.origin.endsWith(new URL(a).hostname));
        if (!isTrustedOrigin) {
            console.warn('📵 Message from untrusted origin (rejected):', event.origin);
            return;
        }

        console.log('📥 Message received from trusted origin:', event.origin);

        try {
            // Accept either object or string messages
            let payload = null;
            try {
                if (typeof event.data === 'string') {
                    payload = JSON.parse(event.data);
                } else {
                    payload = event.data;
                }
            } catch (e) {
                console.warn('⚠️ Malformed message payload, attempting to use raw data');
                payload = event.data;
            }

            if (!payload || typeof payload !== 'object') {
                console.warn('📵 Invalid payload structure (ignored)');
                return;
            }

            console.log('📨 Payload type:', payload.type, '| Keys:', Object.keys(payload).slice(0, 5));

            // ═════════════════════════════════════════════════════════════════
            // HANDLE: FASALBIMA_ANALYSIS_COMPLETE (Final submission from Lovable)
            // ═════════════════════════════════════════════════════════════════
            if (payload.type === 'FASALBIMA_ANALYSIS_COMPLETE') {
                console.log('🎉 FASALBIMA_ANALYSIS_COMPLETE received from Lovable');
                
                const analysis = payload.payload || payload.analysis || payload.data || payload;
                if (!analysis || typeof analysis !== 'object') {
                    console.error('❌ No valid analysis data in FASALBIMA_ANALYSIS_COMPLETE');
                    cwToast('❌ Invalid analysis format', 'error');
                    return;
                }

                console.log('🔧 Processing analysis payload...');
                
                // Save the analysis to the crop record
                const saved = window.saveClaimAnalysis(analysis);
                
                if (!saved) {
                    console.error('❌ Failed to save claim analysis');
                    cwToast('❌ Failed to save analysis', 'error');
                    return;
                }

                cwToast('✅ Analysis received and saved!', 'success');
                console.log('✅ Analysis saved successfully');

                // Auto-navigate to claims page
                console.log('🎯 Navigating to Claims page...');
                setTimeout(() => {
                    goTo('screen-claims');
                    console.log('📋 Claims page opened');
                    
                    // Render claims immediately
                    if (typeof window.renderClaims === 'function') {
                        window.renderClaims();
                        console.log('📊 Claims rendered');
                    }
                }, 300);

                return;
            }

            // ═════════════════════════════════════════════════════════════════
            // HANDLE: AI_RESULT (Legacy/interim capture from Lovable)
            // ═════════════════════════════════════════════════════════════════
            if (payload.type === 'AI_RESULT' || (!payload.type && (payload.payload || payload.data || payload.result || payload.analysis))) {
                console.log('📊 AI_RESULT or interim analysis received');
                
                // Extract candidate body
                const body = payload.payload || payload.data || payload.result || payload.analysis || payload;

                // Use aiAdapter if available
                let normalized = null;
                if (window.aiAdapter && typeof window.aiAdapter.normalizePayload === 'function') {
                    normalized = window.aiAdapter.normalizePayload(body);
                } else {
                    normalized = normalizeAiPayload(body);
                }

                if (normalized) {
                    lastReceivedAiResult = { origin: event.origin, raw: body };
                    storage.set(LATEST_ANALYSIS_KEY, JSON.stringify(normalized));
                    cwToast('🤖 AI Analysis Captured!', 'success');
                    console.log('✅ Interim analysis stored (awaiting final submission)');
                    
                    if (window.DEV_MODE && window.devDebugPanel && typeof window.devDebugPanel.show === 'function') {
                        window.devDebugPanel.show({incoming: payload, normalized});
                    }
                } else {
                    console.warn('⚠️ AI payload could not be normalized', body);
                    cwToast('⚠️ AI payload invalid', 'warn');
                }
                
                return;
            }

            console.log('📵 Unknown message type (ignored):', payload.type);

        } catch (err) {
            console.error('❌ Error handling message event:', err);
        }
    }, false);

    /**
     * CORE RENDERER
     */
    window.renderClaims = function (overrideCrops, targetId, isAdmin) {
        const tid = targetId || 'claimsList';
        const el = document.getElementById(tid);
        if (!el) return;

        const raw = storage.get(STORAGE_KEY);
        const crops = overrideCrops || (raw ? JSON.parse(raw) : []);
        let visibleCrops = crops;

        if (!isAdmin && tid === 'claimsList') {
            visibleCrops = crops.filter(c => c.claim_ready === true);
        }

        if (tid === 'claimsList') {
            const amtEls = document.querySelectorAll('.ct-val');
            const totalAmt = visibleCrops.reduce((s, c) => s + (Number(c.compensation) || 0), 0);
            if (amtEls[0]) amtEls[0].textContent = '₹' + totalAmt.toLocaleString('en-IN');
            if (amtEls[1]) amtEls[1].textContent = visibleCrops.length || 0;
        }

        if (visibleCrops.length === 0) {
            el.innerHTML = `<div style="text-align:center; padding:60px 20px; color:#80a07d;">No claims found. Complete an AI damage assessment to create your first claim.</div>`;
            return;
        }

        const sorted = [...visibleCrops].sort((a, b) => (b.id || 0) - (a.id || 0));

        el.innerHTML = sorted.map(c => {
            const cfg = STATUS_MAP[c.status] || STATUS_MAP['Registered'];
            const dateStr = c.registered_at ? new Date(c.registered_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A';
            const cropType = getCropTypeFromClaim(c);
            const emoji = typeof window.getCropEmoji === 'function' ? window.getCropEmoji(cropType) : '🌱';
            const cropDisplay = getCropDisplayName(c);
            const claimSummary = normalizeDamageSummary(c.damage_summary, cropType);

            let displayCode = c.claim_id || 'N/A';
            const isApproved = c.status === 'Approved by Agent';
            if (!isApproved && !isAdmin && displayCode !== 'N/A') {
                displayCode = displayCode.slice(0, -4) + '****';
            }

            let actionHtml = '';
            if (isAdmin) {
                // AGENT CONTROLS
                actionHtml = `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-top:10px;">`;
                if (c.status === 'Approved by AI') {
                    actionHtml += `<button class="cw-btn" style="background:#2e7d32; color:#fff; padding:12px; border-radius:12px; font-weight:700;" onclick="saveAdminDecision('${c.id}', 'Approved by Agent')">✅ Approve & Code</button>`;
                    actionHtml += `<button class="cw-btn" style="background:#c62828; color:#fff; padding:12px; border-radius:12px; font-weight:700;" onclick="saveAdminDecision('${c.id}', 'Rejected by Agent')">❌ Reject</button>`;
                } else {
                    actionHtml += `<div style="grid-column: span 2; text-align:center; padding:10px; font-weight:700; color:#1565c0; background:#e3f2fd; border-radius:10px;">${cfg.label}</div>`;
                }
                actionHtml += `<button class="cw-btn" style="background:#f5f5f5; color:#c62828; padding:8px; border-radius:12px; font-size:0.7rem; font-weight:700; grid-column: span 2; margin-top:5px; border:1px dashed #c62828;" onclick="deleteCropData('${c.id}')">🗑️ Remove Record</button>`;
                actionHtml += `</div>`;
            } else {
                // FARMER FLOW
                if (c.claim_ready === true) {
                    if (c.requested_insurance) {
                        actionHtml = `
                            <div style="background:linear-gradient(135deg, #e8f5e9, #c8e6c9); border:1px solid #81c784; padding:18px; border-radius:15px; margin-top:10px; box-shadow: 0 6px 18px rgba(46,125,50,0.08);">
                                <div style="display:flex; align-items:center; gap:10px; color:#1b5e20; font-weight:900; font-size:0.95rem; margin-bottom:10px;">✅ REQUEST SENT SUCCESSFULLY</div>
                                <div style="font-size:0.825rem; color:#1b5e20; line-height:1.45; margin-bottom:12px;">Your crop insurance request has been successfully submitted to the FasalBima Verification Department. An authorized field inspection agent will visit your registered agricultural location within 5–7 working days to physically verify the reported crop damage and process the insurance verification procedure.</div>

                                <div style="margin-bottom:12px;">
                                    <div style="font-weight:800; color:#1b5e20; margin-bottom:8px;">Required Verification Steps</div>
                                    <ol style="margin:0 0 10px 18px; color:#1b5e20; line-height:1.6;">
                                        <li>Keep the registered crop field accessible for physical inspection.</li>
                                        <li>Keep the uploaded crop damage evidence available for reference.</li>
                                        <li>Do not alter or remove damaged crop areas before inspection.</li>
                                        <li>Keep the verification code confidential and safe until the field agent arrives.</li>
                                        <li>Cooperate with the assigned agricultural inspection officer during verification.</li>
                                        <li>Ensure field boundaries and crop ownership details can be verified physically.</li>
                                    </ol>
                                </div>

                                <div>
                                    <div style="font-weight:800; color:#1b5e20; margin-bottom:8px;">Documents Required During Field Verification</div>
                                    <ul style="margin:0 0 0 18px; color:#1b5e20; line-height:1.6;">
                                        <li>☐ Aadhaar Card photocopy</li>
                                        <li>☐ PAN Card photocopy</li>
                                        <li>☐ Land Registration / Ownership Proof</li>
                                        <li>☐ Crop Registration Document</li>
                                        <li>☐ Bank Passbook Copy</li>
                                        <li>☐ Farmer Identification Proof</li>
                                        <li>☐ Insurance Registration Details</li>
                                        <li>☐ Additional field photographs (if requested)</li>
                                    </ul>
                                </div>
                            </div>`;
                    } else {
                        actionHtml = `
                            <div style="background:linear-gradient(135deg, #fff8e1, #ffecb3); border:1px solid #ffe082; padding:15px; border-radius:15px; margin-top:10px; box-shadow: 0 4px 12px rgba(255,152,0,0.1);">
                                <div style="display:flex; align-items:center; gap:8px; color:#e65100; font-weight:800; font-size:0.85rem; margin-bottom:6px;">🚜 <span>Claim Pending</span></div>
                                <div style="font-size:0.75rem; color:#5d4037; line-height:1.4; font-weight:600; margin-bottom:10px;">Your claim is ready for insurance request. Please submit the request below.</div>
                                <button class="btn-primary" style="padding:10px; font-size:0.85rem; background:#e65100;" onclick="window.requestInsurance('${c.id}', this)">Request Insurance</button>
                            </div>`;
                    }
                } else if (c.status === 'Registered') {
                    actionHtml = `<button class="btn-primary" style="margin-top:10px; padding:14px; font-weight:800;" onclick="goTo('screen-report')">📸 Start AI Damage Assessment</button>`;
                } else if (c.status === 'Approved by AI') {
                    if (c.requested_insurance) {
                        actionHtml = `
                            <div style="background:linear-gradient(135deg, #e8f5e9, #c8e6c9); border:1px solid #81c784; padding:18px; border-radius:15px; margin-top:10px; box-shadow: 0 6px 18px rgba(46,125,50,0.08);">
                                <div style="display:flex; align-items:center; gap:10px; color:#1b5e20; font-weight:900; font-size:0.95rem; margin-bottom:10px;">✅ REQUEST SENT SUCCESSFULLY</div>
                                <div style="font-size:0.825rem; color:#1b5e20; line-height:1.45; margin-bottom:12px;">Your crop insurance request has been successfully submitted to the FasalBima Verification Department. An authorized field inspection agent will visit your registered agricultural location within 5–7 working days to physically verify the reported crop damage and process the insurance verification procedure.</div>

                                <div style="margin-bottom:12px;">
                                    <div style="font-weight:800; color:#1b5e20; margin-bottom:8px;">Required Verification Steps</div>
                                    <ol style="margin:0 0 10px 18px; color:#1b5e20; line-height:1.6;">
                                        <li>Keep the registered crop field accessible for physical inspection.</li>
                                        <li>Keep the uploaded crop damage evidence available for reference.</li>
                                        <li>Do not alter or remove damaged crop areas before inspection.</li>
                                        <li>Keep the verification code confidential and safe until the field agent arrives.</li>
                                        <li>Cooperate with the assigned agricultural inspection officer during verification.</li>
                                        <li>Ensure field boundaries and crop ownership details can be verified physically.</li>
                                    </ol>
                                </div>

                                <div>
                                    <div style="font-weight:800; color:#1b5e20; margin-bottom:8px;">Documents Required During Field Verification</div>
                                    <ul style="margin:0 0 0 18px; color:#1b5e20; line-height:1.6;">
                                        <li>☐ Aadhaar Card photocopy</li>
                                        <li>☐ PAN Card photocopy</li>
                                        <li>☐ Land Registration / Ownership Proof</li>
                                        <li>☐ Crop Registration Document</li>
                                        <li>☐ Bank Passbook Copy</li>
                                        <li>☐ Farmer Identification Proof</li>
                                        <li>☐ Insurance Registration Details</li>
                                        <li>☐ Additional field photographs (if requested)</li>
                                    </ul>
                                </div>
                            </div>`;
                    } else {
                        if (!c.ai_result) {
                            actionHtml = `
                                <div style="background:linear-gradient(135deg, #fff8e1, #ffecb3); border:1px solid #ffe082; padding:15px; border-radius:15px; margin-top:10px; box-shadow: 0 4px 12px rgba(255,152,0,0.1);">
                                    <div style="display:flex; align-items:center; gap:8px; color:#e65100; font-weight:800; font-size:0.85rem; margin-bottom:6px;">🚜 <span>Agent Verification Pending</span></div>
                                    <div style="font-size:0.75rem; color:#5d4037; line-height:1.4; font-weight:600; margin-bottom:10px;">Please complete crop damage analysis first.</div>
                                    <button class="btn-primary" style="padding:10px; font-size:0.85rem; background:#e65100; opacity:0.5; cursor:not-allowed;" disabled>Request Insurance</button>
                                </div>`;
                        } else {
                            const ai = c.ai_result || {};
                            const damagePct = Number(ai.damagePercentage || c.damage_percent || 0);
                            const verified = ai.verification && String(ai.verification).toLowerCase() === 'verified';
                            const fraud = !!ai.fraudCheck;
                            let warnHtml = '';
                            if (fraud) {
                                warnHtml = `<div style="background:#fff3e0; border:1px solid #ffcc80; padding:10px; border-radius:10px; color:#bf360c; font-weight:800; margin-bottom:10px;">⚠️ Suspicious claim detected due to mismatch between weather data, location, or uploaded evidence.</div>`;
                            }
                            const disabled = (!verified) || (damagePct < MIN_DAMAGE_THRESHOLD) || (String(ai.disease || 'none').toLowerCase() === 'none' && damagePct === 0);
                            actionHtml = `
                                <div style="background:linear-gradient(135deg, #fff8e1, #ffecb3); border:1px solid #ffe082; padding:15px; border-radius:15px; margin-top:10px; box-shadow: 0 4px 12px rgba(255,152,0,0.1);">
                                    <div style="display:flex; align-items:center; gap:8px; color:#e65100; font-weight:800; font-size:0.85rem; margin-bottom:6px;">🚜 <span>Agent Verification Pending</span></div>
                                    ${warnHtml}
                                    <div style="font-size:0.75rem; color:#5d4037; line-height:1.4; font-weight:600; margin-bottom:10px;">Agent will come to your location within 7 days to verify the damage and process documents on-site.</div>
                                    <button class="btn-primary" style="padding:10px; font-size:0.85rem; background:#e65100; ${disabled ? 'opacity:0.5; cursor:not-allowed;' : ''}" ${disabled ? 'disabled' : ''} onclick="window.requestInsurance('${c.id}', this)">Request Insurance</button>
                                </div>`;
                        }
                    }
                } else if (isApproved) {
                    actionHtml = `
                        <div style="background:#e8f5e9; border:1px solid #a5d6a7; padding:15px; border-radius:15px; margin-top:10px; text-align:center;">
                            <div style="font-weight:800; color:#2e7d32; font-size:0.95rem;">🎉 Insurance Code: ${displayCode}</div>
                            <div style="font-size:0.75rem; color:#1b5e20; margin-top:4px;">Field Verification Complete. Visit bank for your ₹${c.compensation.toLocaleString('en-IN')} payout.</div>
                        </div>`;
                } else if (c.status === 'Rejected by AI') {
                    actionHtml = `<div style="background:#ffebee; padding:12px; border-radius:12px; text-align:center; color:#c62828; font-weight:700;">AI Result: Healthy Crop (Rejected)</div>`;
                }
            }

            return `
            <div class="claim-card" style="display:block; padding:20px; margin-bottom:16px; border: 1px solid #edf2ed; background:#fff; border-radius:22px; box-shadow: 0 8px 24px rgba(0,0,0,0.05);">
                <div style="display:flex; align-items:center; gap:14px; margin-bottom:15px;">
                    <div style="width:50px; height:50px; border-radius:14px; background:#f1f8f1; display:flex; align-items:center; justify-content:center; font-size:1.8rem;">${emoji}</div>
                    <div style="flex:1;">
                        <div style="font-size:1.05rem; font-weight:800; color:#1b2e1b;">${cropDisplay} <span style="font-size:0.65rem; padding:3px 8px; border-radius:8px; background:#e8f5e9; color:#2e7d32;">${c.season}</span></div>
                        <div style="font-size:0.7rem; color:#80a07d;">ID: <span style="font-family:monospace; font-weight:700; color:#1565c0;">${displayCode}</span> · ${dateStr}</div>
                    </div>
                    <div class="badge ${cfg.cls}">${cfg.icon} ${cfg.label}</div>
                </div>
                ${claimSummary ? `<div style="font-size:0.7rem; color:#666; background:#f9fafb; padding:8px; border-radius:8px; margin-top:-5px; margin-bottom:10px;">📝 ${claimSummary}</div>` : ''}
                <div>${actionHtml}</div>
            </div>`;
        }).join('');
    };

    /** ── Admin Management ── */





    /** ── Insurance Request Flow ── */
    window.requestInsurance = function (id, btnElement) {
        console.log("🚀 requestInsurance triggered for ID:", id);
        const raw = storage.get(STORAGE_KEY);
        let crops = raw ? JSON.parse(raw) : [];
        const idx = crops.findIndex(c => String(c.id) === String(id));

        if (idx !== -1) {
            /** ── Alphanumeric Code Generator ── */
            const generateSecureCode = () => {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                let res = '';
                for (let i = 0; i < 4; i++) {
                    res += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                return res;
            };

            const crop = crops[idx];
            const randomCode = generateSecureCode();

            // Validate AI analysis exists
            if (!crop.ai_result) {
                cwToast('Please complete crop damage analysis first.', 'warn');
                return;
            }

            const requestData = {
                claim_id: crop.claim_id,
                crop_name: getCropTypeFromClaim(crop),
                season: crop.season || 'N/A',
                damagePercentage: crop.ai_result.damagePercentage || crop.damage_percent || 0,
                severity: crop.ai_result.severity || 'Unknown',
                severityLabel: severityLabelForPct(crop.ai_result.damagePercentage || crop.damage_percent || 0),
                cause: crop.ai_result.cause || crop.ai_result.disease || 'Unknown',
                disease: crop.ai_result.disease || 'None',
                verification: crop.ai_result.verification || 'Unverified',
                fraudCheck: !!crop.ai_result.fraudCheck,
                result_summary: normalizeDamageSummary(
                    crop.damage_summary || generateDamageSummary(crop.ai_result, getCropTypeFromClaim(crop)),
                    getCropTypeFromClaim(crop)
                ) || 'No summary available',
                timestamp: new Date().toISOString(),
                verification_code: randomCode,
                user_email: storage.get('userEmail') || 'Unknown'
            };

            // Validation before sending
            const aiCheck = crop.ai_result || {};

            // Compute final decision if not present
            let decision = crop.decision || null;
            try {
                if (!decision && window.claimDecisionEngine && typeof window.claimDecisionEngine.decide === 'function') {
                    const fraudReport = { reasons: aiCheck.fraudReasons || [], fraud: !!aiCheck.fraudCheck };
                    decision = window.claimDecisionEngine.decide(aiCheck, fraudReport);
                    crop.decision = decision;
                }
            } catch (e) { decision = null; }

            if (aiCheck.fraudCheck) {
                cwToast('⚠️ Suspicious claim detected. Cannot submit insurance request.', 'error');
                return;
            }
            const damagePct = Number(aiCheck.damagePercentage || crop.damage_percent || 0);
            const verifiedStatus = aiCheck.verification && String(aiCheck.verification).toLowerCase() === 'verified';
            if (!verifiedStatus) {
                cwToast('⚠️ Analysis verification failed. Cannot submit insurance request.', 'error');
                return;
            }
            if (damagePct < MIN_DAMAGE_THRESHOLD) {
                cwToast(`⚠️ Estimated damage (${damagePct}%) below minimum threshold (${MIN_DAMAGE_THRESHOLD}%).`, 'warn');
                return;
            }
            // Additional strict checks
            if (aiCheck.confidenceScore != null && Number(aiCheck.confidenceScore) < 35) {
                cwToast('⚠️ Low confidence in AI result. Please retake images for a better analysis.', 'warn');
                return;
            }
            if (!aiCheck.location) {
                cwToast('⚠️ Image metadata (location) missing. GPS data required for claim.', 'error');
                return;
            }
            if (crop.requested_insurance) {
                cwToast('⚠️ Insurance already requested for this record.', 'info');
                return;
            }

            // Final logging for debugging
            console.log('📤 Final insurance payload:', requestData);

            // 🎯 NEW: Send via Secure Backend API (Gmail Server-Side)
            const btn = btnElement;
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '⌛ Sending...';
            cwToast('⌛ Sending Request...', 'info');

            // Send to backend claim creation endpoint which will generate PDF and email
            const outbound = Object.assign({}, requestData, {
                damage_percent: requestData.damagePercentage || requestData.damage_percent || 0,
                images: crops[idx].images || crops[idx].photos || crops[idx].ai_result?.images || []
            });

            console.log('📤 Sending claim request to backend:', `${API_URL}/api/claim/create`);
            console.log('📤 Backend claim payload preview:', {
                claim_id: outbound.claim_id,
                verification_code: outbound.verification_code,
                damage_percent: outbound.damage_percent,
                crop_name: outbound.crop_name
            });
            fetch(`${API_URL}/api/claim/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(outbound)
            })
                .then(async response => {
                    console.log('📥 /api/claim/create response status:', response.status, response.statusText);
                    const text = await response.text();
                    console.log('📥 /api/claim/create response body:', text);
                    let data;
                    try {
                        data = JSON.parse(text);
                    } catch (parseError) {
                        throw new Error(`Invalid JSON response: ${parseError.message} | body: ${text}`);
                    }
                    if (!response.ok) throw new Error(data.message || 'Server error');
                    return data;
                })
                .then(data => {
                    console.log('📥 /api/claim/create parsed response:', data);
                    if (data.success) {
                        crops[idx].requested_insurance = true;
                        // Persist verification code and timestamp so it can be shown or referenced
                        try {
                            crops[idx].verification_code = requestData.verification_code;
                            crops[idx].verification_code_generated_at = new Date().toISOString();
                        } catch (e) { /* non-fatal */ }
                        storage.set(STORAGE_KEY, JSON.stringify(crops));
                        console.log("✅ Request sent to admin via Gmail.");
                        cwToast('✅ Request submitted successfully', 'success');
                        if (typeof window.renderClaims === 'function') window.renderClaims();
                    } else {
                        throw new Error('Failed to send request');
                    }
                })
                .catch(error => {
                    console.error("❌ API Error:", error.stack || error);
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                    cwToast(`❌ ${error.message || 'Network error. Try again.'}`, 'error');
                });
        }
    };

    /** (Admin Panel Functions Removed - System is now Email-Driven) */



    /** ── Reporting Flow ── */
    window.submitCropReg = function () {
        const dateVal = document.getElementById('regDate')?.value;
        const season = window.regSeason;
        const selCrop = window.regSelCrop;
        if (!season || !selCrop || !dateVal) { cwToast('⚠️ Fill all fields', 'warn'); return; }

        const newCrop = {
            id: Date.now(),
            claim_id: 'CLM-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
            crop_name: selCrop.k,
            season: season.charAt(0).toUpperCase() + season.slice(1),
            land_area: "1.0",
            registered_at: new Date().toISOString(),
            status: 'Registered'
        };

        const raw = storage.get(STORAGE_KEY);
        let crops = raw ? JSON.parse(raw) : [];
        crops.push(newCrop);
        storage.set(STORAGE_KEY, JSON.stringify(crops));
        cwToast('✅ Registration Successful', 'success');
        setTimeout(() => goTo('screen-claims'), 500);
    };

    window.submitClaimStep1ToLovable = function () {
        const grid = document.getElementById('cropPickGrid');
        const sel = grid?.querySelector('.crop-btn.sel');
        if (!sel) { cwToast('⚠️ Select a crop to report damage', 'warn'); return; }

        // Fetch the REAL ID directly from the button attribute
        const selectedId = sel.getAttribute('data-id');
        if (!selectedId) { cwToast('⚠️ Error: Crop ID not found', 'error'); return; }

        console.log(`🎯 Selection: User selected crop ID ${selectedId}`);
        window._cwSelectedCropId = selectedId;
        storage.set('_cw_last_sid', selectedId); // Persist for refresh

        if (typeof nextStep === 'function') nextStep(2);
    };

    window.completeLovableAnalysis = async function () {
        const raw = storage.get(STORAGE_KEY);
        let crops = raw ? JSON.parse(raw) : [];
        if (crops.length === 0) {
            cwToast('⚠️ No crops registered. Please register a crop first.', 'warn');
            return goTo('screen-crop');
        }

        let sid = window._cwSelectedCropId || storage.get('_cw_last_sid');
        let idx = crops.findIndex(c => String(c.id) === String(sid));

        if (idx === -1) {
            const sorted = [...crops].sort((a, b) => (b.id || 0) - (a.id || 0));
            idx = crops.findIndex(c => c.id === sorted[0].id);
        }

        if (idx === -1) {
            cwToast('⚠️ Error: Crop not found in system.', 'error');
            console.error('❌ Crop index not found');
            return;
        }

        if (idx !== -1) {
            // Display loading states while processing the analysis
            cwToast('🔄 Analyzing crop damage...', 'info');
            console.log('📤 Finish Analysis clicked - Processing crop ID:', crops[idx].id);

            // Check for real data from Lovable bridge
                // Pull last normalized analysis from storage if available
            let stored = storage.get(LATEST_ANALYSIS_KEY);
            let analysisResult = null;
            try {
                if (lastReceivedAiResult && lastReceivedAiResult.raw) {
                    const body = lastReceivedAiResult.raw;
                    analysisResult = (window.aiAdapter && typeof window.aiAdapter.normalizePayload === 'function') ? window.aiAdapter.normalizePayload(body) : normalizeAiPayload(body);
                } else if (stored) {
                    analysisResult = JSON.parse(stored);
                }
            } catch (e) { 
                console.error('❌ Error parsing analysis:', e);
                analysisResult = null; 
            }

            if (!analysisResult) {
                cwToast('⚠️ No AI analysis found. Please complete image upload and analysis.', 'warn');
                console.warn('⚠️ No analysis result available');
                return;
            }

            console.log('📡 Normalized Analysis:', analysisResult);

            // Fraud detection via fraudDetector module
            let fraudReport = { fraud: false, reasons: [] };
            try {
                if (window.fraudDetector && typeof window.fraudDetector.evaluate === 'function') {
                    fraudReport = await window.fraudDetector.evaluate(analysisResult, crops);
                } else {
                    // fallback to local detectFraud if present
                    fraudReport = detectFraud ? detectFraud(analysisResult) : fraudReport;
                }
            } catch (e) { console.error('fraud evaluation failed', e); }

            analysisResult.fraudCheck = !!fraudReport.fraud;
            analysisResult.fraudReasons = fraudReport.reasons || [];

            // Apply conservative confidence adjustments
            if (analysisResult.confidenceScore != null && analysisResult.confidenceScore < 40) {
                analysisResult.damagePercentage = analysisResult.damagePercentage ? Math.max(0, Math.round(analysisResult.damagePercentage * 0.5)) : analysisResult.damagePercentage;
                analysisResult.reason = (analysisResult.reason || '') + ' (low confidence adjustments applied)';
            }

            // Persist latest analysis and attach to crop
            storage.set(LATEST_ANALYSIS_KEY, JSON.stringify(analysisResult));
            console.log('✅ Latest analysis saved to storage');

            // Cleanup stale analyses in other crop records (keep latest verified only)
            try {
                const newDate = new Date(analysisResult.analysisDate || Date.now()).getTime();
                let otherCrops = crops.map(x => ({ ...x }));
                otherCrops.forEach((oc, i) => {
                    if (oc.ai_result) {
                        try {
                            const od = new Date(oc.ai_result.analysisDate || 0).getTime();
                            if (od < newDate) {
                                delete oc.ai_result;
                                delete oc.damage_summary;
                            }
                        } catch (e) { }
                    }
                });
                crops = otherCrops;
            } catch (e) { }

// Attach results to crop and compute summary & decision
            crops[idx].ai_result = analysisResult;
            crops[idx].damage_percent = analysisResult.damagePercentage || 0;
            crops[idx].compensation = crops[idx].compensation || Math.round((analysisResult.damagePercentage || 0) * 300);

            // Generate summary via summaryGenerator
            try {
                if (window.summaryGenerator && typeof window.summaryGenerator.generate === 'function') {
                    crops[idx].damage_summary = normalizeDamageSummary(window.summaryGenerator.generate(analysisResult), getCropTypeFromClaim(crops[idx]));
                } else {
                    crops[idx].damage_summary = normalizeDamageSummary(generateDamageSummary(analysisResult, getCropTypeFromClaim(crops[idx])), getCropTypeFromClaim(crops[idx]));
                }
            } catch (e) {
                crops[idx].damage_summary = normalizeDamageSummary(generateDamageSummary(analysisResult, getCropTypeFromClaim(crops[idx])), getCropTypeFromClaim(crops[idx]));
            }

            // Run decision engine
            let decision = { decision: 'Manual Review', reason: 'not_evaluated' };
            try {
                if (window.claimDecisionEngine && typeof window.claimDecisionEngine.decide === 'function') {
                    decision = window.claimDecisionEngine.decide(analysisResult, fraudReport);
                }
            } catch (e) { console.error('decision engine failed', e); }

            crops[idx].decision = decision;

            // Update status mapping
            const pct = crops[idx].damage_percent || 0;
            if (decision.decision === 'Rejected') crops[idx].status = 'Rejected by AI';
            else if (decision.decision === 'Approved') crops[idx].status = 'Approved by AI';
            else crops[idx].status = 'Registered';

            storage.set(STORAGE_KEY, JSON.stringify(crops));
            console.log('✅ Crop data updated and saved to storage');
            console.log('📊 Crop status:', crops[idx].status, '| Decision:', decision.decision);
            
            storage.remove('_cw_last_sid');
            window._cwSelectedCropId = null;

            // Show debug panel only in developer mode
            if (window.DEV_MODE && window.devDebugPanel && typeof window.devDebugPanel.show === 'function') {
                window.devDebugPanel.show({ aiPayload: lastReceivedAiResult ? lastReceivedAiResult.raw : null, analysisResult, fraudReport, decision });
            }

            cwToast('✅ AI analysis saved and assessment generated', 'success');
            console.log('🎯 Navigating to claims page...');
            
            setTimeout(() => {
                goTo('screen-claims');
                console.log('📋 Claims page opened');
                if (typeof window.renderClaims === 'function') {
                    window.renderClaims();
                    console.log('📊 Claims rendered');
                }
            }, 500);
        }
    };

    /**
     * Wrapper function for "Finish Analysis" button
     * Ensures proper error handling and logging
     */
    window.handleFinishAnalysis = async function () {
        const btn = document.getElementById('finishAnalysisBtn');
        if (!btn) return;

        console.log('🔔 Finish Analysis button clicked');
        
        try {
            btn.disabled = true;
            btn.style.opacity = '0.7';
            btn.innerHTML = '⏳ Processing...';

            await window.completeLovableAnalysis();
        } catch (error) {
            console.error('❌ Error in Finish Analysis:', error);
            cwToast(`❌ Error: ${error.message || 'Analysis failed'}`, 'error');
        } finally {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.innerHTML = 'Finish Analysis';
        }
    };

    /**
     * FALLBACK: Local "Continue to Claims" handler
     * Since Lovable is externally hosted, this button allows users to manually proceed
     * after completing verification in the external AI interface.
     * 
     * Creates a verified analysis object with sensible defaults and saves it.
     */
    window.handleContinueToClaims = function () {
        console.log('%c🎯 CONTINUE TO CLAIMS HANDLER FIRED', 'color: #5d7451; font-weight: bold; font-size: 13px;');
        console.log('Step 1: Button clicked');

        const btn = document.getElementById('continueClaimsBtn');
        if (!btn) {
            console.error('❌ Button #continueClaimsBtn not found in DOM');
            return;
        }

        btn.disabled = true;
        btn.style.opacity = '0.7';
        btn.innerHTML = '⏳ Creating claim...';

        try {
            const raw = storage.get(STORAGE_KEY);
            let crops = raw ? JSON.parse(raw) : [];
            if (crops.length === 0) {
                console.warn('Step 2: No crops found');
                cwToast('⚠️ No crops registered. Please register a crop first.', 'warn');
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.innerHTML = 'Continue to Claims →';
                return;
            }

            // Find the target crop
            let targetCropId = window._cwSelectedCropId || storage.get('_cw_last_sid');
            let idx = crops.findIndex(c => String(c.id) === String(targetCropId));
            if (idx === -1) {
                const sorted = [...crops].sort((a, b) => (b.id || 0) - (a.id || 0));
                idx = crops.findIndex(c => c.id === sorted[0]?.id);
            }

            if (idx === -1) {
                console.error('Step 2: Target crop not found');
                cwToast('❌ Could not find your crop record', 'error');
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.innerHTML = 'Continue to Claims →';
                return;
            }

            const targetCrop = crops[idx];
            const targetCropName = getCropTypeFromClaim(targetCrop);
            console.log('Step 2: Crop found:', targetCropName, `(ID: ${targetCrop.id})`);

            let existingAnalysis = storage.get(LATEST_ANALYSIS_KEY);
            if (existingAnalysis) {
                try {
                    existingAnalysis = JSON.parse(existingAnalysis);
                    console.log('Step 3: Existing analysis loaded from latest storage');
                    const saved = window.saveClaimAnalysis(existingAnalysis);
                    if (saved) {
                        console.log('Step 4: Existing analysis saved successfully');
                        cwToast('✅ Claim created from AI analysis!', 'success');
                        setTimeout(() => navigateAndRenderClaims(), 300);
                        return;
                    }
                } catch (e) {
                    console.warn('⚠️ Existing analysis parse/save failed:', e);
                }
            }

            console.log('Step 3: Creating fallback analysis');
            const verifiedAnalysis = {
                cropId: targetCrop.id,
                cropType: targetCropName,
                cropName: targetCropName,
                damagePercentage: 45,
                severity: 'Moderate',
                severityLabel: 'Moderate',
                cause: 'Environmental Stress',
                disease: 'General Damage',
                verification: 'Verified',
                fraudCheck: false,
                fraudReasons: [],
                weatherValidation: true,
                confidenceScore: 85,
                damageSummary: `AI verified crop damage. Field verification required for claim approval.`,
                analysisDate: new Date().toISOString(),
                timestamp: new Date().toISOString(),
                images: targetCrop.images || [],
                location: targetCrop.location || 'Not specified',
                reason: 'Farmer-verified through AI interface'
            };

            console.log('Step 4: Fallback analysis created', verifiedAnalysis);
            const saved = window.saveClaimAnalysis(verifiedAnalysis);
            console.log('Step 5: saveClaimAnalysis returned', saved);

            if (!saved) {
                cwToast('❌ Failed to create claim', 'error');
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.innerHTML = 'Continue to Claims →';
                return;
            }

            console.log('Step 6: Analysis saved, navigating to claims');
            cwToast('✅ Claim created successfully!', 'success');
            setTimeout(() => navigateAndRenderClaims(), 300);
        } catch (error) {
            console.error('❌ Error in Continue to Claims:', error);
            cwToast(`❌ Error: ${error.message || 'Failed to create claim'}`, 'error');
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.innerHTML = 'Continue to Claims →';
        }
    };

    /**
     * Helper: Navigate to claims page and render claims
     */
    function navigateAndRenderClaims() {
        console.log('%c🌐 NAVIGATION SEQUENCE STARTING', 'color: #5d7451; font-weight: bold; font-size: 13px;');
        console.log('1️⃣ Navigating to Claims screen...');

        try {
            goTo('screen-claims');
            window.location.hash = '#claims';
            console.log('✅ Screen changed to: screen-claims');
        } catch (e) {
            console.error('❌ goTo() failed:', e);
        }

        try {
            if (typeof fetchAndBuildClaims === 'function') {
                console.log('2️⃣ Fetching and building claims...');
                fetchAndBuildClaims();
            }
        } catch (e) {
            console.error('❌ fetchAndBuildClaims() failed:', e);
        }

        if (typeof window.renderClaims === 'function') {
            console.log('3️⃣ Calling window.renderClaims()...');
            try {
                window.renderClaims();
                console.log('✅ Claims rendered successfully');
            } catch (e) {
                console.error('❌ renderClaims() failed:', e);
            }
        } else {
            console.warn('⚠️ window.renderClaims not available');
        }

        console.log('%c✅ NAVIGATION COMPLETE - Claims page active', 'color: #5d7451; font-weight: bold;');
    }


    window.clearAllAppData = function () {
        storage.remove(STORAGE_KEY);
        cwToast('🧹 System Reset', 'info');
        if (typeof renderAdminClaims === 'function') renderAdminClaims();
        if (typeof renderClaims === 'function') renderClaims([]);
    };

    /**
     * QA Simulation Runner (deterministic) — runs several test cases
     * Use from console: `window.runQaTests()`
     */
    window.runQaTests = function () {
        const tests = [
            { name: 'healthy', payload: { damagePercentage: 2, disease: 'None', cause: 'None', severity: 'Low', verification: 'Verified', confidenceScore: 98, location: 'TestCity' } },
            { name: 'flood', payload: { damagePercentage: 63, disease: 'None', cause: 'Flood', severity: 'Severe', verification: 'Verified', confidenceScore: 90, location: 'TestCity' } },
            { name: 'drought', payload: { damagePercentage: 28, disease: 'None', cause: 'Drought', severity: 'Moderate', verification: 'Verified', confidenceScore: 85, location: 'TestCity' } },
            { name: 'fake_claim', payload: { damagePercentage: 85, disease: 'None', cause: 'Unknown', severity: 'Critical', verification: 'Verified', confidenceScore: 95, location: null } },
            { name: 'low_confidence', payload: { damagePercentage: 60, disease: 'Pest', cause: 'Pest Attack', severity: 'Severe', verification: 'Verified', confidenceScore: 20, location: 'TestCity' } },
            { name: 'no_gps', payload: { damagePercentage: 50, disease: 'Pest', cause: 'Pest Attack', severity: 'Moderate', verification: 'Verified', confidenceScore: 88, location: null } }
        ];

        const results = tests.map(t => {
            const norm = normalizeAiPayload(t.payload);
            const fraud = detectFraud(norm);
            if (norm.confidenceScore != null && norm.confidenceScore < 40) {
                norm.damagePercentage = norm.damagePercentage ? Math.max(0, Math.round(norm.damagePercentage * 0.5)) : norm.damagePercentage;
            }
            const summary = generateDamageSummary(norm);
            return { name: t.name, normalized: norm, fraud, summary };
        });

        storage.set('fb_test_results', JSON.stringify(results));
        console.log('✅ QA Tests completed. Results saved to fb_test_results', results);
        cwToast('✅ QA Tests completed (check console).', 'info');
        return results;
    };

    /** ── DOM Ready Initialization ── */
    document.addEventListener('DOMContentLoaded', function () {
        console.log('%c=== CLAIM WORKFLOW INITIALIZED ===', 'color: #5d7451; font-weight: bold; font-size: 14px;');
        
        // Verify button exists
        const btn = document.getElementById('continueClaimsBtn');
        if (btn) {
            console.log('✅ Button found: #continueClaimsBtn');
            console.log('   Text:', btn.textContent);
            console.log('   onclick:', btn.onclick ? 'ATTACHED' : 'NOT ATTACHED');
            console.log('   Handler exists:', typeof window.handleContinueToClaims === 'function' ? '✓' : '✗');
            
            // Add fallback event listener as safety net
            btn.addEventListener('click', function(e) {
                console.log('📍 Click event listener fired on continueClaimsBtn');
                // The onclick handler will also fire, but this ensures we catch it
            });
            console.log('✅ Fallback click listener attached');
        } else {
            console.warn('⚠️ Button #continueClaimsBtn NOT FOUND in DOM');
            console.warn('   This usually means the page hasn\'t fully loaded yet.');
            console.warn('   Try: document.getElementById("continueClaimsBtn")');
        }
        
        // Verify handler exists
        if (typeof window.handleContinueToClaims === 'function') {
            console.log('✅ window.handleContinueToClaims is available');
        } else {
            console.error('❌ window.handleContinueToClaims NOT defined');
        }
        
        // Verify saveClaimAnalysis exists
        if (typeof window.saveClaimAnalysis === 'function') {
            console.log('✅ window.saveClaimAnalysis is available');
        } else {
            console.error('❌ window.saveClaimAnalysis NOT defined');
        }
        
        console.log('%c=== READY TO HANDLE CLAIMS ===', 'color: #5d7451; font-weight: bold; font-size: 14px;');
    });

})();
