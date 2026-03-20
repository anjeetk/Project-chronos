const { getSupabase } = require('./_supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const sb = getSupabase();
  if (!sb) return res.json([]);
  
  try {
    const { data: items, error } = await sb.storage.from('sessions').list('');
    if (error || !items) return res.json([]);
    
    const recordings = [];
    for (const item of items) {
      if (!item.name || item.name.startsWith('.')) continue;
      try {
        const { data: blob } = await sb.storage.from('sessions').download(`${item.name}/manifest.json`);
        if (!blob) continue;
        const text = await blob.text();
        const manifest = JSON.parse(text);
        recordings.push({
          session_id: item.name,
          records: (manifest.records || []).length,
          batches: (manifest.merkle_batches || []).length,
          genesis_hash: manifest.genesis_hash || '',
        });
      } catch (e2) { continue; }
    }
    return res.json(recordings);
  } catch (e) {
    return res.json([]);
  }
};
