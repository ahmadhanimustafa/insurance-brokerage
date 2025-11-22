// backend/src/routes/endorsement.js

const express = require('express');
const router = express.Router();

// ==========================================
// ENDORSEMENT MODULE ENDPOINTS
// ==========================================

let endorsements = [];
let nextEndorsementId = 1;

router.get('/endorsements', (req, res) => {
  res.json({
    success: true,
    data: endorsements
  });
});

router.post('/endorsements', (req, res) => {
  const { policy_id, type, description, effective_date } = req.body;

  if (!policy_id || !type) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Policy ID and type required' }
    });
  }

  const newEndorsement = {
    id: nextEndorsementId++,
    policy_id,
    type,
    description,
    effective_date: effective_date || new Date().toISOString(),
    status: 'pending',
    created_at: new Date()
  };

  endorsements.push(newEndorsement);

  res.status(201).json({
    success: true,
    data: newEndorsement
  });
});

router.get('/endorsements/:id', (req, res) => {
  const endorsement = endorsements.find(e => e.id === parseInt(req.params.id));
  if (!endorsement) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Endorsement not found' }
    });
  }
  res.json({ success: true, data: endorsement });
});

module.exports = router;