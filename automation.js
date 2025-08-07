const puppeteer = require('puppeteer');
const { PQueue } = require('p-queue');
const { simulateHumanDelay } = require('./utils');

async function loginSienge(page) {
  await page.goto('https://npu2.sienge.com.br/sienge/8/index.html#/common/page/1256');
  await simulateHumanDelay();
  await page.click('//*[@id="btnEntrarComSiengeID"]');
  await simulateHumanDelay();
  await page.click('//*[@id="root"]/div[2]/div/div/div/div/div/div[1]/div/div/div/div/ul/div');
  await page.waitForNavigation();
}

async function registerPayment(page, data) {
  await page.goto('https://npu2.sienge.com.br/sienge/8/index.html#/common/page/1256');
  await simulateHumanDelay();
  await page.type('//*[@id="filter.dtBaixa"]', data.Data);
  await simulateHumanDelay();
  await page.select('//*[@id="filter.cdTipoBaixa"]', data.TipoBaixa);
  await simulateHumanDelay();
  await page.type('//*[@id="filter.contaCorrente.empresa.cdEmpresaView"]', data.Empresa.toString());
  await simulateHumanDelay();
  await page.type('//*[@id="entity.contaCorrente.contaCorrentePK.nuConta"]', data.ContaCorrente.toString());
  await simulateHumanDelay();
  await page.type('//*[@id="filter.titulo"]', data.Titulo.toString());
  await simulateHumanDelay();
  await page.type('//*[@id="filter.parcela"]', data.Parcela.toString());
  await simulateHumanDelay();
  await page.click('//*[@id="holderConteudo2"]/form/p/span[1]/span/input');
  await simulateHumanDelay();

  const selectElementExists = await page.$('//*[@id="row[0].flSelecao_0"]');
  if (selectElementExists) {
    await page.click('//*[@id="row[0].flSelecao_0"]');
    await simulateHumanDelay();

    await page.click('//*[@id="row[0].editar_0"]');
    await simulateHumanDelay();

    if (data.ParcialTotal === 'T') {
      await page.click('//*[@id="entity.flParcialTotalTotal"]');
    } else if (data.ParcialTotal === 'P') {
      await page.click('//*[@id="entity.flParcialTotalParcial"]');
      await simulateHumanDelay();
      await page.type('//*[@id="entity.vlPagto"]', data.Valor.toString());
    }
    await simulateHumanDelay();

    await page.click('//*[@id="holderConteudo2"]/table[3]/tbody/tr/td[1]/a');
    await simulateHumanDelay();
    await page.type('//*[@id="entity.vlCorMonetaria"]', data.CorrecaoMonetaria.toString());
    await simulateHumanDelay();
    await page.type('//*[@id="entity.vlJuros"]', data.Juros.toString());
    await simulateHumanDelay();
    await page.type('//*[@id="entity.vlMulta"]', data.Multa.toString());
    await simulateHumanDelay();

    await page.click('//*[@id="holderConteudo2"]/form/p/span/span/input');
    await simulateHumanDelay();
    await page.click('//*[@id="holderConteudo2"]/table[1]/tbody/tr/td[1]/a');
    await simulateHumanDelay();
    await page.click('//*[@id="botaoSalvar"]');
    await page.waitForNavigation();
  }
}

async function processPayments(data) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  const queue = new PQueue({ concurrency: 5 });

  try {
    await loginSienge(page);
    for (const entry of data) {
      await queue.add(() => registerPayment(page, entry));
    }
    return { success: true, message: 'Processamento concluído com sucesso!' };
  } catch (error) {
    return { success: false, message: `Erro durante o processamento: ${error.message}` };
  } finally {
    await browser.close();
  }
}

module.exports = { processPayments };
