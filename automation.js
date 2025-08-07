const puppeteer = require('puppeteer');
const { PQueue } = require('p-queue');
const { simulateHumanDelay } = require('./utils');
const fs = require('fs');

async function loginSienge(page, cookiesFilePath) {
  try {
    // Carrega os cookies do arquivo
    const cookies = JSON.parse(fs.readFileSync(cookiesFilePath));
    await page.setCookie(...cookies);

    // Acessa a página inicial
    await page.goto('https://npu2.sienge.com.br/sienge/8/index.html#/common/page/1256', {
      waitUntil: 'networkidle2'
    });
    await simulateHumanDelay();

    // Verifica se o login foi bem-sucedido
    await page.waitForSelector('//*[@id="filter.dtBaixa"]', { timeout: 10000 });
    console.log('Login bem-sucedido com cookies!');
  } catch (error) {
    console.error('Erro durante o login com cookies:', error);
    throw error;
  }
}

async function registerPayment(page, data) {
  try {
    // Acessa a página inicial
    await page.goto('https://npu2.sienge.com.br/sienge/8/index.html#/common/page/1256', {
      waitUntil: 'networkidle2'
    });
    await simulateHumanDelay();

    // Preenche os campos do filtro
    await page.waitForSelector('//*[@id="filter.dtBaixa"]');
    await page.type('//*[@id="filter.dtBaixa"]', data.Data);
    await simulateHumanDelay();

    await page.waitForSelector('//*[@id="filter.cdTipoBaixa"]');
    await page.select('//*[@id="filter.cdTipoBaixa"]', data.TipoBaixa);
    await simulateHumanDelay();

    await page.waitForSelector('//*[@id="filter.contaCorrente.empresa.cdEmpresaView"]');
    await page.type('//*[@id="filter.contaCorrente.empresa.cdEmpresaView"]', data.Empresa.toString());
    await simulateHumanDelay();

    await page.waitForSelector('//*[@id="entity.contaCorrente.contaCorrentePK.nuConta"]');
    await page.type('//*[@id="entity.contaCorrente.contaCorrentePK.nuConta"]', data.ContaCorrente.toString());
    await simulateHumanDelay();

    await page.waitForSelector('//*[@id="filter.titulo"]');
    await page.type('//*[@id="filter.titulo"]', data.Titulo.toString());
    await simulateHumanDelay();

    await page.waitForSelector('//*[@id="filter.parcela"]');
    await page.type('//*[@id="filter.parcela"]', data.Parcela.toString());
    await simulateHumanDelay();

    // Clica em Consultar
    await page.waitForSelector('//*[@id="holderConteudo2"]/form/p/span[1]/span/input');
    await page.click('//*[@id="holderConteudo2"]/form/p/span[1]/span/input');
    await simulateHumanDelay();

    // Verifica se o elemento de seleção existe
    const selectElementExists = await page.$('//*[@id="row[0].flSelecao_0"]');
    if (selectElementExists) {
      await page.click('//*[@id="row[0].flSelecao_0"]');
      await simulateHumanDelay();

      // Verifica se deve executar o bloco opcional
      if (data.ExecutarOpcional === 'S') {
        await page.waitForSelector('//*[@id="row[0].editar_0"]');
        await page.click('//*[@id="row[0].editar_0"]');
        await simulateHumanDelay();

        if (data.ParcialTotal === 'T') {
          await page.waitForSelector('//*[@id="entity.flParcialTotalTotal"]');
          await page.click('//*[@id="entity.flParcialTotalTotal"]');
        } else if (data.ParcialTotal === 'P') {
          await page.waitForSelector('//*[@id="entity.flParcialTotalParcial"]');
          await page.click('//*[@id="entity.flParcialTotalParcial"]');
          await simulateHumanDelay();
          await page.waitForSelector('//*[@id="entity.vlPagto"]');
          await page.type('//*[@id="entity.vlPagto"]', data.Valor.toString());
        }
        await simulateHumanDelay();

        await page.waitForSelector('//*[@id="holderConteudo2"]/table[3]/tbody/tr/td[1]/a');
        await page.click('//*[@id="holderConteudo2"]/table[3]/tbody/tr/td[1]/a');
        await simulateHumanDelay();

        await page.waitForSelector('//*[@id="entity.vlCorMonetaria"]');
        await page.type('//*[@id="entity.vlCorMonetaria"]', data.CorrecaoMonetaria.toString());
        await simulateHumanDelay();

        await page.waitForSelector('//*[@id="entity.vlJuros"]');
        await page.type('//*[@id="entity.vlJuros"]', data.Juros.toString());
        await simulateHumanDelay();

        await page.waitForSelector('//*[@id="entity.vlMulta"]');
        await page.type('//*[@id="entity.vlMulta"]', data.Multa.toString());
        await simulateHumanDelay();

        await page.waitForSelector('//*[@id="holderConteudo2"]/form/p/span/span/input');
        await page.click('//*[@id="holderConteudo2"]/form/p/span/span/input');
        await simulateHumanDelay();

        await page.waitForSelector('//*[@id="holderConteudo2"]/table[1]/tbody/tr/td[1]/a');
        await page.click('//*[@id="holderConteudo2"]/table[1]/tbody/tr/td[1]/a');
        await simulateHumanDelay();
      }

      // Clica em Efetuar Baixa
      await page.waitForSelector('//*[@id="botaoSalvar"]');
      await page.click('//*[@id="botaoSalvar"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
    } else {
      console.log(`Nenhum resultado encontrado para Título ${data.Titulo}, Parcela ${data.Parcela}`);
    }
  } catch (error) {
    console.error(`Erro ao processar Título ${data.Titulo}, Parcela ${data.Parcela}:`, error);
    throw error;
  }
}

async function processPayments(data, cookiesFilePath) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  const queue = new PQueue({ concurrency: 1 });

  try {
    await loginSienge(page, cookiesFilePath);
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
