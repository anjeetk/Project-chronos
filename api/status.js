module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    session_id: null, seq: 0, latest_hash: '', prev_hash: '',
    batches: 0, running: false, camera_mode: 'serverless',
    message: 'Live pipeline unavailable on serverless. Use Demo Mode.',
  });
};
