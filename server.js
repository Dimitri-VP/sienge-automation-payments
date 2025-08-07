const express = require('express');
const multer = require('multer');
const path = require('path');
const { readExcel } = require('./utils');
const { processPayments } = require('./automation');
const { generateExcelTemplate } = require('./generateTemplate');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/download-template', async (req, res) => {
  try {
    const filePath = await generateExcelTemplate();
    res.download(filePath, 'template.xlsx');
  } catch (error) {
    res.status(500).json({ success: false, message: `Erro ao gerar template: ${error.message}` });
  }
});

app.post('/upload', upload.single('excelFile'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const data = await readExcel(filePath);
    const result = await processPayments(data);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: `Erro: ${error.message}` });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
