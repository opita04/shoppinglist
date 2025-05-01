const express = require('express');
const path = require('path');
// const fs = require('fs'); // Import the 'fs' module - REMOVED

const app = express();
const port = process.env.PORT || 8080; // Firebase App Hosting uses port 8080 by default

// Serve static files (HTML, CSS, JS) from the public directory
// console.log(`Serving static files from: ${path.join(__dirname, 'public')}`); // Log static path - REMOVED
app.use(express.static(path.join(__dirname, 'public')));

// Send index.html for any request that doesn't match a static file
app.get('/*', (req, res) => {
  // const filePath = path.join(__dirname, 'public', 'index.html'); - REMOVED
  // console.log(`Attempting to send file: ${filePath}`); // Log file path - REMOVED
  // fs.access(filePath, fs.constants.F_OK, (err) => { - REMOVED
  //   if (err) { - REMOVED
  //     console.error(`Error accessing file before sendFile: ${err}`); // Log access error - REMOVED
  //     // Optionally send a 404 or specific error message here instead of letting sendFile fail - REMOVED
  //     res.status(404).send('index.html not found!'); - REMOVED
  //   } else { - REMOVED
  //     console.log(`File exists, proceeding with sendFile: ${filePath}`); // Log success - REMOVED
       res.sendFile(path.join(__dirname, 'public', 'index.html')); // Reverted to original sendFile call
  //     res.sendFile(filePath, (sendFileErr) => { - REMOVED
  //       if (sendFileErr) { - REMOVED
  //         console.error(`Error sending file with sendFile: ${sendFileErr}`); // Log sendFile specific error - REMOVED
  //         // Ensure response isn't sent twice if headers were already sent - REMOVED
  //         if (!res.headersSent) { - REMOVED
  //            res.status(500).send('Error sending file.'); - REMOVED
  //         } - REMOVED
  //       } - REMOVED
  //     }); - REMOVED
  //   } - REMOVED
  // }); - REMOVED
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(port, () => {
  // console.log(`Shopping List App listening on port ${port}`);
});