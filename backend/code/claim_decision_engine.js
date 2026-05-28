(function(){
    'use strict';
    window.claimDecisionEngine = {
        decide(analysis, fraudReport) {
            try {
                if (!analysis) return { decision: 'Rejected', reason: 'no_analysis' };
                const pct = analysis.damagePercentage || 0;
                const confidence = analysis.confidenceScore || 0;

                // Healthy -> Reject
                if (pct <= 5) return { decision: 'Rejected', reason: 'healthy_crop' };

                // Fraud indicators -> Manual Review or Reject
                if (fraudReport && fraudReport.reasons && fraudReport.reasons.length > 0) {
                    // if only low severity issues -> manual review, else reject/manual
                    if (fraudReport.reasons.includes('low_confidence') && confidence >= 20) return { decision: 'Manual Review', reason: 'low_confidence' };
                    return { decision: 'Manual Review', reason: 'fraud_indicators', details: fraudReport.reasons };
                }

                // Severe and verified -> Approve
                if (pct >= 51 && analysis.verification && String(analysis.verification).toLowerCase() === 'verified' && confidence >= 50) {
                    return { decision: 'Approved', reason: 'severe_verified' };
                }

                // Moderate cases -> if verified and decent confidence -> Manual Review
                if (pct >= 26 && pct <= 50) {
                    if (analysis.verification && String(analysis.verification).toLowerCase() === 'verified' && confidence >= 40) return { decision: 'Manual Review', reason: 'moderate_damage_needs_agent' };
                    return { decision: 'Manual Review', reason: 'insufficient_evidence' };
                }

                // Minor cases -> Reject or Manual depending
                if (pct >= 6 && pct <= 25) {
                    return { decision: 'Manual Review', reason: 'minor_damage_check' };
                }

                return { decision: 'Manual Review', reason: 'uncertain' };
            } catch (e) {
                console.error('claimDecisionEngine.decide failed', e);
                return { decision: 'Manual Review', reason: 'decision_error' };
            }
        }
    };
})();
