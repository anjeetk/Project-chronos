module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ status: 'unavailable', message: 'Tamper simulation requires local backend.' });
};
