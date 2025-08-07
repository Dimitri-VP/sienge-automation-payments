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

app.post('/upload', upload.fields([
  { name: 'excelFile', maxCount: 1 },
  { name: 'cookiesFile', maxCount: 1 }
]), async (req, res) => {
  try {
    const excelFilePath = req.files['excelFile'] ? req.files['excelFile'][0].path : null;
    const cookiesFilePath = req.files['cookiesFile'] ? req.files['cookiesFile'][0].path : null;

    if (!excelFilePath || !cookiesFilePath) {
      throw new Error('Both Excel and Cookies files are required.');
    }

    const data = await readExcel(excelFilePath);
    const result = await processPayments(data, cookiesFilePath);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: `Erro: ${error.message}` });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
