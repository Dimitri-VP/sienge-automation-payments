const ExcelJS = require('exceljs');
const path = require('path');

async function generateExcelTemplate() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Contas a Pagar');

  // Define as colunas do cabeçalho
  worksheet.columns = [
    { header: 'Data', key: 'Data', width: 15 },
    { header: 'TipoBaixa', key: 'TipoBaixa', width: 10 },
    { header: 'Empresa', key: 'Empresa', width: 10 },
    { header: 'ContaCorrente', key: 'ContaCorrente', width: 15 },
    { header: 'Titulo', key: 'Titulo', width: 10 },
    { header: 'Parcela', key: 'Parcela', width: 10 },
    { header: 'ParcialTotal', key: 'ParcialTotal', width: 12 },
    { header: 'Valor', key: 'Valor', width: 10 },
    { header: 'CorrecaoMonetaria', key: 'CorrecaoMonetaria', width: 15 },
    { header: 'Juros', key: 'Juros', width: 10 },
    { header: 'Multa', key: 'Multa', width: 10 },
    { header: 'ExecutarOpcional', key: 'ExecutarOpcional', width: 15 }
  ];

  // Adiciona uma linha de exemplo
  worksheet.addRow({
    Data: '2025-08-07',
    TipoBaixa: '1',
    Empresa: 123,
    ContaCorrente: 456,
    Titulo: 789,
    Parcela: 1,
    ParcialTotal: 'T',
    Valor: 1000,
    CorrecaoMonetaria: 50,
    Juros: 20,
    Multa: 10,
    ExecutarOpcional: 'S'
  });

  // Estiliza o cabeçalho
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Salva o arquivo
  const filePath = path.join(__dirname, 'public', 'template.xlsx');
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

module.exports = { generateExcelTemplate };
