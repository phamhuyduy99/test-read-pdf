import jsonServer from 'json-server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const server = jsonServer.create();

// Sửa đường dẫn - quay về thư mục cha (thoát khỏi dist)
const dbPath = join(process.cwd(), 'db.json');
console.log('📁 Current working directory:', process.cwd());
console.log('📁 Database path:', dbPath);
console.log('📁 Database exists:', existsSync(dbPath));

const router = jsonServer.router(dbPath);
const middlewares = jsonServer.defaults();

// Use default middlewares
server.use(middlewares);
server.use(jsonServer.bodyParser);

server.get('/api/v1/documents', (req, res) => {
  try {
    const db = router.db;
    
    // Log chi tiết
    const dbState = db.getState();
    console.log('📊 Full DB State:', dbState);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const documents = (db.get('documents') as any).value();
    console.log('📄 Documents:', documents);
    
    res.json(documents);
  } catch (error) {
    console.error('❌ Error:', error);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.status(500).json({ error: (error as any).message });
  }
});

// Sửa đường dẫn pdfs cũng tương tự
server.get('/api/v1/pdfs/:filename', (req, res) => {
  const filename: string = req.params.filename;
  const filePath: string = join(process.cwd(), 'pdfs', filename); // Quay về thư mục gốc
  
  console.log(`📤 Serving PDF: ${filename}`);
  console.log(`📁 PDF path: ${filePath}`);
  console.log(`📁 PDF exists: ${existsSync(filePath)}`);
  
  try {
    if (!existsSync(filePath)) {
      res.status(404).json({ error: 'PDF file not found' });
      return;
    }

    const fileBuffer: Buffer = readFileSync(filePath);
    
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

// Tương tự với route download
server.get('/api/v1/documents/:id/download', (req, res) => {
  const documentId: string = req.params.id;
  const db = router.db;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const document = (db.get('documents') as any).find({ id: parseInt(documentId) }).value();
  
  if (!document) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  
  const filePath: string = join(process.cwd(), 'pdfs', document.filename); // Quay về thư mục gốc
  
  console.log(`📥 Download PDF: ${document.filename}`);
  console.log(`📁 PDF path: ${filePath}`);
  
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
  console.log(`🎯 JSON Server is running on port:${PORT}`);
  console.log(`📁 Current directory: ${process.cwd()}`);
  console.log(`📁 Database path: ${dbPath}`);
  console.log(`📁 Database exists: ${existsSync(dbPath)}`);
});