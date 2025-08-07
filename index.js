const puppeteer = require('puppeteer');
const ExcelJS = require('exceljs');
const { PQueue } = require('p-queue');

async function readExcel(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet(1);
  const data = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      data.push({
        supplier: row.getCell(1).value,
        amount: row.getCell(2).value,
        date: row.getCell(3).value
      });
    }
  });
  return data;
}

async function simulateHumanDelay(min = 1000, max = 3000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise(resolve => setTimeout(resolve, delay));
}

async function loginSienge(page) {
  await page.goto('https://npu2.sienge.com.br/sienge/');
  await simulateHumanDelay();
  await page.type('#username', process.env.SIENGE_USERNAME || 'seu_usuario');
  await simulateHumanDelay();
  await page.type('#password', process.env.SIENGE_PASSWORD || 'sua_senha');
  await simulateHumanDelay();
  await page.click('#login-button');
  await page.waitForNavigation();
}

async function registerPayment(page, data) {
  // Substitua pela URL real da seção de contas a pagar
  await page.goto('URL_DA_SECAO_CONTAS_A_PAGAR');
  await simulateHumanDelay();
  await page.type('#supplier-field', data.supplier);
  await simulateHumanDelay();
  await page.type('#amount-field', data.amount.toString());
  await simulateHumanDelay();
  await page.click('#submit-button');
  await page.waitForNavigation();
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  const queue = new PQueue({ concurrency: 5 });

  try {
    await loginSienge(page);
    const data = await readExcel('contas_a_pagar.xlsx');
    for (const entry of data) {
      await queue.add(() => registerPayment(page, entry));
    }
    console.log('Processamento concluído com sucesso!');
  } catch (error) {
    console.error('Erro durante o processamento:', error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
