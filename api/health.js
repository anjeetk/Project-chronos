module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ ok: true, env: 'vercel', runtime: 'node', endpoint: 'health' });
};
