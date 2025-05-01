const express = require('express');
const path = require('path');
// const fs = require('fs'); // Import the 'fs' module - REMOVED

const app = express();
const port = process.env.PORT || 8080; // Firebase App Hosting uses port 8080 by default

// Middleware to parse JSON bodies
app.use(express.json()); 

// Serve static files (HTML, CSS, JS) from the public directory
// console.log(`Serving static files from: ${path.join(__dirname, 'public')}`); // Log static path - REMOVED
app.use(express.static(path.join(__dirname, 'public')));

// --- API Endpoints ---

// Endpoint to copy items from one list to another
app.post('/api/lists/:destinationListId/copy-from/:sourceListId', async (req, res, next) => {
  const { destinationListId, sourceListId } = req.params;
  // console.log(`[Server Log] Received request to copy items from list ${sourceListId} to ${destinationListId}`); // <-- REMOVE THIS

  if (sourceListId === destinationListId) {
    console.warn('[Server Warn] Source and destination list IDs are the same.');
    return res.status(400).json({ message: 'Source and destination lists cannot be the same.' });
  }

  try {
    // Dynamically import the specific function needed
    const firestoreModule = await import('./firestore.mjs');
    const copyListItems = firestoreModule.copyListItems;

    if (typeof copyListItems !== 'function') {
      throw new Error("copyListItems function not found in firestore.mjs");
    }
    
    // console.log(`[Server Log] Calling copyListItems function for ${sourceListId} -> ${destinationListId}`); // <-- REMOVE THIS
    const result = await copyListItems(sourceListId, destinationListId);
    // console.log('[Server Log] copyListItems returned:', result); // <-- REMOVE THIS

    if (result.success) {
      res.status(200).json(result);
    } else {
      // This case might not be reached if copyListItems throws on error, but good practice
      throw new Error(result?.message || 'Copy operation failed in Firestore module.');
    }

  } catch (error) {
    // Catch errors from dynamic import OR from copyListItems function
    console.error(`[Server Error] Error during copy operation (${sourceListId} -> ${destinationListId}):`, error.message);
    // Forward error to the error handling middleware
    next(error); 
  }
});

// Send index.html for any **other** GET request that doesn't match static files or API
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

// Error handling middleware (keep this last)
app.use((err, req, res, next) => {
  console.error("[Server Error Middleware]", err);
  // Send a user-friendly error response
  // Avoid sending stack trace in production
  res.status(500).json({ 
      message: 'An internal server error occurred.', 
      // Optionally include error details in development
      error: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

app.listen(port, () => {
  console.log(`Shopping List App listening on port ${port}`); // Re-enabled startup log
});