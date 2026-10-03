module.exports = (req, res) => {
  try {
    const app = require('../server/index.cjs');
    return app(req, res);
  } catch (err) {
    console.error('Serverless function initialization failed.');
    res.status(500).json({ error: 'Layanan backend belum tersedia.' });
  }
};
