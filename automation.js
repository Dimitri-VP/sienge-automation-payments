const puppeteer = require('puppeteer');
const PQueue = require('p-queue').default;
const { simulateHumanDelay } = require('./utils');
const fs = require('fs');

// Lista de opções válidas para TipoBaixa
const VALID_TIPO_BAIXA = [
  'Pagamento',
  'Adiantamento',
  'Cancelamento',
  'Por Bens',
  'Outros',
  'Abatimento de Adiantamento'
];

async function loginSienge(page, cookiesFilePath) {
  try {
    // Carrega os cookies do arquivo
    const cookies = JSON.parse(fs.readFileSync(cookiesFilePath));
    await page.setCookie(...cookies);

    // Define um user-agent para evitar detecção de bot
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36');

    // Acessa a página inicial
    console.log('Acessando a página da Sienge...');
    await page.goto('https://npu2.sienge.com.br/sienge/8/index.html#/common/page/1256', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    await simulateHumanDelay();

    // Verifica a URL atual
    const currentUrl = await page.url();
    console.log('URL atual após page.goto:', currentUrl);
    if (!currentUrl.includes('#/common/page/1256')) {
      throw new Error('Redirecionamento detectado. Cookies podem estar inválidos.');
    }

    // Captura de tela para depuração
    await page.screenshot({ path: 'screenshot-login.png' });
    console.log('Captura de tela salva em screenshot-login.png');

    // Aguarda o elemento dinamicamente
    await page.waitForFunction(
      () => document.querySelector('#filter\\.dtBaixa') !== null,
      { timeout: 30000 }
    );
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
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    await simulateHumanDelay();

    // Preenche os campos do filtro
    await page.waitForFunction(
      () => document.querySelector('#filter\\.dtBaixa') !== null,
      { timeout: 30000 }
    );
    await page.type('#filter\\.dtBaixa', data.Data);
    await simulateHumanDelay();

    await page.waitForFunction(
      () => document.querySelector('#filter\\.cdTipoBaixa') !== null,
      { timeout: 30000 }
    );
    // Valida o valor de TipoBaixa
    if (!VALID_TIPO_BAIXA.includes(data.TipoBaixa)) {
      throw new Error(`Valor inválido para TipoBaixa: ${data.TipoBaixa}. Use uma das opções: ${VALID_TIPO_BAIXA.join(', ')}.`);
    }
    await page.select('#filter\\.cdTipoBaixa', data.TipoBaixa);
    await simulateHumanDelay();

    await page.waitForFunction(
      () => document.querySelector('#filter\\.contaCorrente\\.empresa\\.cdEmpresaView') !== null,
      { timeout: 30000 }
    );
    await page.type('#filter\\.contaCorrente\\.empresa\\.cdEmpresaView', data.Empresa.toString());
    await simulateHumanDelay();

    await page.waitForFunction(
      () => document.querySelector('#entity\\.contaCorrente\\.contaCorrentePK\\.nuConta') !== null,
      { timeout: 30000 }
    );
    await page.type('#entity\\.contaCorrente\\.contaCorrentePK\\.nuConta', data.ContaCorrente.toString());
    await simulateHumanDelay();

    await page.waitForFunction(
      () => document.querySelector('#filter\\.titulo') !== null,
      { timeout: 30000 }
    );
    await page.type('#filter\\.titulo', data.Titulo.toString());
    await simulateHumanDelay();

    await page.waitForFunction(
      () => document.querySelector('#filter\\.parcela') !== null,
      { timeout: 30000 }
    );
    await page.type('#filter\\.parcela', data.Parcela.toString());
    await simulateHumanDelay();

    // Clica em Consultar
    await page.waitForFunction(
      () => document.querySelector('#holderConteudo2 > form > p > span:nth-child(1) > span > input') !== null,
      { timeout: 30000 }
    );
    await page.click('#holderConteudo2 > form > p > span:nth-child(1) > span > input');
    await simulateHumanDelay();

    // Verifica se o elemento de seleção existe
    const selectElementExists = await page.$('#row\\[0\\]\\.flSelecao_0');
    if (selectElementExists) {
      await page.click('#row\\[0\\]\\.flSelecao_0');
      await simulateHumanDelay();

      // Verifica se deve executar o bloco opcional
      if (data.ExecutarOpcional === 'S') {
        await page.waitForFunction(
          () => document.querySelector('#row\\[0\\]\\.editar_0') !== null,
          { timeout: 30000 }
        );
        await page.click('#row\\[0\\]\\.editar_0');
        await simulateHumanDelay();

        if (data.ParcialTotal === 'T') {
          await page.waitForFunction(
            () => document.querySelector('#entity\\.flParcialTotalTotal') !== null,
            { timeout: 30000 }
          );
          await page.click('#entity\\.flParcialTotalTotal');
        } else if (data.ParcialTotal === 'P') {
          await page.waitForFunction(
            () => document.querySelector('#entity\\.flParcialTotalParcial') !== null,
            { timeout: 30000 }
          );
          await page.click('#entity\\.flParcialTotalParcial');
          await simulateHumanDelay();
          await page.waitForFunction(
            () => document.querySelector('#entity\\.vlPagto') !== null,
            { timeout: 30000 }
          );
          await page.type('#entity\\.vlPagto', data.Valor.toString());
        }
        await simulateHumanDelay();

        await page.waitForFunction(
          () => document.querySelector('#holderConteudo2 > table:nth-child(3) > tbody > tr > td:nth-child(1) > a') !== null,
          { timeout: 30000 }
        );
        await page.click('#holderConteudo2 > table:nth-child(3) > tbody > tr > td:nth-child(1) > a');
        await simulateHumanDelay();

        await page.waitForFunction(
          () => document.querySelector('#entity\\.vlCorMonetaria') !== null,
          { timeout: 30000 }
        );
        await page.type('#entity\\.vlCorMonetaria', data.CorrecaoMonetaria.toString());
        await simulateHumanDelay();

        await page.waitForFunction(
          () => document.querySelector('#entity\\.vlJuros') !== null,
          { timeout: 30000 }
        );
        await page.type('#entity\\.vlJuros', data.Juros.toString());
        await simulateHumanDelay();

        await page.waitForFunction(
          () => document.querySelector('#entity\\.vlMulta') !== null,
          { timeout: 30000 }
        );
        await page.type('#entity\\.vlMulta', data.Multa.toString());
        await simulateHumanDelay();

        await page.waitForFunction(
          () => document.querySelector('#holderConteudo2 > form > p > span > span > input') !== null,
          { timeout: 30000 }
        );
        await page.click('#holderConteudo2 > form > p > span > span > input');
        await simulateHumanDelay();

        await page.waitForFunction(
          () => document.querySelector('#holderConteudo2 > table:nth-child(1) > tbody > tr > td:nth-child(1) > a') !== null,
          { timeout: 30000 }
        );
        await page.click('#holderConteudo2 > table:nth-child(1) > tbody > tr > td:nth-child(1) > a');
        await simulateHumanDelay();
      }

      // Clica em Efetuar Baixa
      await page.waitForFunction(
        () => document.querySelector('#botaoSalvar') !== null,
        { timeout: 30000 }
      );
      await page.click('#botaoSalvar');
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
