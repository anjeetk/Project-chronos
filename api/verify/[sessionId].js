const { getSupabase } = require('../_supabase');

module.exports = async (req, res) => {
  const { sessionId } = req.query;
  res.setHeader('Access-Control-Allow-Origin', '*');
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });
  
  try {
    const { data: blob } = await sb.storage.from('sessions').download(`${sessionId}/manifest.json`);
    if (!blob) return res.status(404).json({ error: 'Session not found' });
    
    const manifest = JSON.parse(await blob.text());
    const records = manifest.records || [];
    let valid = true, broken_at = null;
    
    for (let i = 1; i < records.length; i++) {
      if (records[i].prev_hash !== records[i - 1].chain_hash) {
        valid = false;
        broken_at = i;
        break;
      }
    }
    return res.json({ ok: valid, valid, verified_count: records.length, broken_at });
  } catch (e) {
    return res.status(404).json({ error: `Session '${sessionId}' not found` });
  }
};
