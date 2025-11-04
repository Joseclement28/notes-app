const express = require('express');
const app = express();
const PORT = 8080;

app.get('/', (req, res) => {
  res.send('Hello from Notes Backend!');
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
