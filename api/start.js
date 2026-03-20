module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    status: 'unavailable',
    message: 'Recording requires local backend. Use Demo Mode on Vercel.',
  });
};
