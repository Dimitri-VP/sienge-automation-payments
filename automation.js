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
  let frame = null;
  try {
    // Carrega os cookies do arquivo
    const cookies = JSON.parse(fs.readFileSync(cookiesFilePath));
    await page.setCookie(...cookies);

    // Define um user-agent para simular navegador
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36');

    // Acessa a página inicial
    console.log('Acessando a página da Sienge...');
    await page.goto('https://npu2.sienge.com.br/sienge/8/index.html#/common/page/1256', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    await simulateHumanDelay();

    // Verifica a URL atual
    const currentUrl = await page.url();
    console.log('URL atual após page.goto:', currentUrl);
    if (!currentUrl.includes('#/common/page/1256')) {
      throw new Error('Redirecionamento detectado. Cookies podem estar inválidos.');
    }

    // Captura de tela inicial
    await page.screenshot({ path: 'screenshot-login-initial.png' });
    console.log('Captura de tela inicial salva em screenshot-login-initial.png');

    // Verifica se há iframes
    const iframes = await page.$$('iframe');
    console.log(`Encontrados ${iframes.length} iframes na página`);
    if (iframes.length === 0) {
      throw new Error('Nenhum iframe encontrado, mas o elemento deveria estar em um iframe.');
    }

    // Usa o primeiro iframe
    frame = await iframes[0].contentFrame();
    console.log('Acessando o primeiro iframe...');
    const elementInFrame = await frame.$('xpath=//*[@id="filter.dtBaixa"]');
    console.log('Elemento //*[@id="filter.dtBaixa"] no iframe:', elementInFrame ? 'Encontrado' : 'Não encontrado');

    // Aguarda o elemento no iframe com XPath
    await frame.waitForXPath('//*[@id="filter.dtBaixa"]', { timeout: 60000, visible: true });
    console.log('Elemento filter.dtBaixa encontrado no iframe com XPath');

    // Captura de tela após encontrar o elemento
    await page.screenshot({ path: 'screenshot-login-success.png' });
    console.log('Captura de tela de sucesso salva em screenshot-login-success.png');

    console.log('Login bem-sucedido com cookies!');
    return frame; // Retorna o frame para uso em registerPayment
  } catch (error) {
    // Captura de tela em caso de erro
    await page.screenshot({ path: 'screenshot-login-error.png' });
    console.log('Captura de tela de erro salva em screenshot-login-error.png');
    console.error('Erro durante o login com cookies:', error);
    throw error;
  }
}

async function registerPayment(page, frame, data) {
  try {
    // Acessa a página inicial
    await page.goto('https://npu2.sienge.com.br/sienge/8/index.html#/common/page/1256', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    await simulateHumanDelay();

    // Usa o frame retornado por loginSienge
    if (!frame) {
      const iframes = await page.$$('iframe');
      if (iframes.length === 0) {
        throw new Error('Nenhum iframe encontrado em registerPayment.');
      }
      frame = await iframes[0].contentFrame();
    }

    // Preenche os campos do filtro no iframe
    await frame.waitForXPath('//*[@id="filter.dtBaixa"]', { timeout: 60000, visible: true });
    await frame.type('xpath=//*[@id="filter.dtBaixa"]', data.Data);
    await simulateHumanDelay();

    await frame.waitForXPath('//*[@id="filter.cdTipoBaixa"]', { timeout: 60000, visible: true });
    if (!VALID_TIPO_BAIXA.includes(data.TipoBaixa)) {
      throw new Error(`Valor inválido para TipoBaixa: ${data.TipoBaixa}. Use uma das opções: ${VALID_TIPO_BAIXA.join(', ')}.`);
    }
    await frame.select('xpath=//*[@id="filter.cdTipoBaixa"]', data.TipoBaixa);
    await simulateHumanDelay();

    await frame.waitForXPath('//*[@id="filter.contaCorrente.empresa.cdEmpresaView"]', { timeout: 60000, visible: true });
    await frame.type('xpath=//*[@id="filter.contaCorrente.empresa.cdEmpresaView"]', data.Empresa.toString());
    await simulateHumanDelay();

    await frame.waitForXPath('//*[@id="entity.contaCorrente.contaCorrentePK.nuConta"]', { timeout: 60000, visible: true });
    await frame.type('xpath=//*[@id="entity.contaCorrente.contaCorrentePK.nuConta"]', data.ContaCorrente.toString());
    await simulateHumanDelay();

    await frame.waitForXPath('//*[@id="filter.titulo"]', { timeout: 60000, visible: true });
    await frame.type('xpath=//*[@id="filter.titulo"]', data.Titulo.toString());
    await simulateHumanDelay();

    await frame.waitForXPath('//*[@id="filter.parcela"]', { timeout: 60000, visible: true });
    await frame.type('xpath=//*[@id="filter.parcela"]', data.Parcela.toString());
    await simulateHumanDelay();

    // Clica em Consultar
    await frame.waitForXPath('//*[@id="holderConteudo2"]/form/p/span[1]/span/input', { timeout: 60000, visible: true });
    await frame.click('xpath=//*[@id="holderConteudo2"]/form/p/span[1]/span/input');
    await simulateHumanDelay();

    // Verifica se o elemento de seleção existe
    const selectElementExists = await frame.$('#row\\[0\\]\\.flSelecao_0');
    if (selectElementExists) {
      await frame.click('#row\\[0\\]\\.flSelecao_0');
      await simulateHumanDelay();

      // Verifica se deve executar o bloco opcional
      if (data.ExecutarOpcional === 'S') {
        await frame.waitForXPath('//*[@id="row[0].editar_0"]', { timeout: 60000, visible: true });
        await frame.click('xpath=//*[@id="row[0].editar_0"]');
        await simulateHumanDelay();

        if (data.ParcialTotal === 'T') {
          await frame.waitForXPath('//*[@id="entity.flParcialTotalTotal"]', { timeout: 60000, visible: true });
          await frame.click('xpath=//*[@id="entity.flParcialTotalTotal"]');
        } else if (data.ParcialTotal === 'P') {
          await frame.waitForXPath('//*[@id="entity.flParcialTotalParcial"]', { timeout: 60000, visible: true });
          await frame.click('xpath=//*[@id="entity.flParcialTotalParcial"]');
          await simulateHumanDelay();
          await frame.waitForXPath('//*[@id="entity.vlPagto"]', { timeout: 60000, visible: true });
          await frame.type('xpath=//*[@id="entity.vlPagto"]', data.Valor.toString());
        }
        await simulateHumanDelay();

        await frame.waitForXPath('//*[@id="holderConteudo2"]/table[3]/tbody/tr/td[1]/a', { timeout: 60000, visible: true });
        await frame.click('xpath=//*[@id="holderConteudo2"]/table[3]/tbody/tr/td[1]/a');
        await simulateHumanDelay();

        await frame.waitForXPath('//*[@id="entity.vlCorMonetaria"]', { timeout: 60000, visible: true });
        await frame.type('xpath=//*[@id="entity.vlCorMonetaria"]', data.CorrecaoMonetaria.toString());
        await simulateHumanDelay();

        await frame.waitForXPath('//*[@id="entity.vlJuros"]', { timeout: 60000, visible: true });
        await frame.type('xpath=//*[@id="entity.vlJuros"]', data.Juros.toString());
        await simulateHumanDelay();

        await frame.waitForXPath('//*[@id="entity.vlMulta"]', { timeout: 60000, visible: true });
        await frame.type('xpath=//*[@id="entity.vlMulta"]', data.Multa.toString());
        await simulateHumanDelay();

        await frame.waitForXPath('//*[@id="holderConteudo2"]/form/p/span/span/input', { timeout: 60000, visible: true });
        await frame.click('xpath=//*[@id="holderConteudo2"]/form/p/span/span/input');
        await simulateHumanDelay();

        await frame.waitForXPath('//*[@id="holderConteudo2"]/table[1]/tbody/tr/td[1]/a', { timeout: 60000, visible: true });
        await frame.click('xpath=//*[@id="holderConteudo2"]/table[1]/tbody/tr/td[1]/a');
        await simulateHumanDelay();
      }

      // Clica em Efetuar Baixa
      await frame.waitForXPath('//*[@id="botaoSalvar"]', { timeout: 60000, visible: true });
      await frame.click('xpath=//*[@id="botaoSalvar"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
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
    const frame = await loginSienge(page, cookiesFilePath);
    for (const entry of data) {
      await queue.add(() => registerPayment(page, frame, entry));
    }
    return { success: true, message: 'Processamento concluído com sucesso!' };
  } catch (error) {
    return { success: false, message: `Erro durante o processamento: ${error.message}` };
  } finally {
    await browser.close();
  }
}

module.exports = { processPayments };
