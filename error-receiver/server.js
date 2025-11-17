const express = require('express');
const app = express();

const cors = require('cors');

app.use(express.json());

app.use(cors());

app.post('/report', (req, res) => {
  console.log('Received error report:', JSON.stringify(req.body, null, 2));
  res.status(200).send('Error report received');
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Error receiver server listening on port ${PORT}`);
  });
}