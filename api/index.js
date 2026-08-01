module.exports = (req, res) => {
  try {
    const app = require('../server/index.cjs');
    return app(req, res);
  } catch (err) {
    console.error('Serverless Error:', err);
    res.status(500).json({ error: 'Serverless Function Error', details: err.message, stack: err.stack });
  }
};
