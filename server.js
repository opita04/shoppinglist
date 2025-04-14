const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000; // Heroku sets PORT env variable

// Serve static files (HTML, CSS, JS) from the current directory
// __dirname ensures the path is correct regardless of where node is run from
app.use(express.static(path.join(__dirname))); 

// Send index.html for any request that doesn't match a static file
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Shopping List App listening on port ${port}`);
});