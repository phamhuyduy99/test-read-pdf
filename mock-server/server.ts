import jsonServer from 'json-server';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create server instance with proper typing
const server = jsonServer.create();
const router = jsonServer.router(join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults();

// Use default middlewares
server.use(middlewares);
server.use(jsonServer.bodyParser);

// Custom route for serving PDF files
server.get('/api/v1/pdfs/:filename', (req, res) => {
  const filename: string = req.params.filename;
  const filePath: string = join(__dirname, 'pdfs', filename);
  
  console.log(`📤 Serving PDF file: ${filename}`);
  
  try {
    if (!existsSync(filePath)) {
      res.status(404).json({ error: 'PDF file not found' });
      return;
    }

    const fileBuffer: Buffer = readFileSync(filePath);
    
    // Set PDF response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', fileBuffer.length.toString());
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    res.send(fileBuffer);
  } catch (error) {
    console.error('Error serving PDF:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Custom route for PDF download
server.get('/api/v1/documents/:id/download', (req, res) => {
  const documentId: string = req.params.id;
  const db = router.db;
  
  // Find document in database with proper typing
  const document = (db.get('documents') as any).find({ id: parseInt(documentId) }).value();
  
  if (!document) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  
  const filePath: string = join(__dirname, 'pdfs', document.filename);
  
  try {
    if (!existsSync(filePath)) {
      res.status(404).json({ error: 'PDF file not found' });
      return;
    }

    const fileBuffer: Buffer = readFileSync(filePath);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', fileBuffer.length.toString());
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    
    res.send(fileBuffer);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Use default router
server.use(router);

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🎯 JSON Server is running on http://localhost:${PORT}`);
  console.log(`📚 PDF files available at: http://localhost:${PORT}/pdfs/`);
  console.log(`📄 Documents API: http://localhost:${PORT}/documents`);
});