const ExcelJS = require('exceljs');

async function readExcel(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet(1);
  const data = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) { // Ignora a primeira linha (cabeçalho)
      data.push({
        Data: row.getCell(1).value,
        TipoBaixa: row.getCell(2).value,
        Empresa: row.getCell(3).value,
        ContaCorrente: row.getCell(4).value,
        Titulo: row.getCell(5).value,
        Parcela: row.getCell(6).value,
        ParcialTotal: row.getCell(7).value,
        Valor: row.getCell(8).value,
        CorrecaoMonetaria: row.getCell(9).value,
        Juros: row.getCell(10).value,
        Multa: row.getCell(11).value,
        ExecutarOpcional: row.getCell(12).value
      });
    }
  });

  return data;
}

function simulateHumanDelay() {
  return new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
}

module.exports = { readExcel, simulateHumanDelay };
