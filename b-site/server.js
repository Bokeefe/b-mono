import express from 'express';
 import path from 'path';
const app = express();
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
 res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start the server
const port = 3000;
app.listen(port, function() {
 console.log('Server listening on port ' + port);
});
