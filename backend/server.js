const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send('CollabCode Signaling Server is alive.');
});

app.listen(PORT, () => {
  console.log(`[VERIFIED] Backend signaling server running on http://localhost:${PORT}`);
});