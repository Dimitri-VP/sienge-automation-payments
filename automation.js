const puppeteer = require('puppeteer');
const PQueue = require('p-queue').default;
const { simulateHumanDelay } = require('./utils');
const fs = require('fs');

async function loginSienge(page, cookiesFilePath) {
  let frame = null;
  try {
    const cookies = JSON.parse(fs.readFileSync(cookiesFilePath));
    await page.setCookie(...cookies);
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36');
    console.log('Acessando a página da Sienge...');
    await page.goto('https://npu2.sienge.com.br/sienge/8/index.html#/common/page/1256', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    await simulateHumanDelay();
    const currentUrl = await page.url();
    console.log('URL atual após page.goto:', currentUrl);
    if (!currentUrl.includes('#/common/page/1256')) {
      throw new Error('Redirecionamento detectado. Cookies podem estar inválidos.');
    }
    try {
      await page.screenshot({ path: 'screenshot-login-initial.png', timeout: 10000 });
      console.log('Captura de tela inicial salva em screenshot-login-initial.png');
    } catch (screenshotError) {
      console.error('Erro ao tirar captura de tela inicial:', screenshotError.message);
    }
    const iframes = await page.$$('iframe');
    console.log(`Encontrados ${iframes.length} iframes na página`);
    if (iframes.length === 0) {
      throw new Error('Nenhum iframe encontrado, mas o elemento deveria estar em um iframe.');
    }
    frame = await iframes[0].contentFrame();
    console.log('Acessando o primeiro iframe...');
    const elementInFrame = await frame.$('#filter\\.dtBaixa');
    console.log('Elemento #filter.dtBaixa no iframe:', elementInFrame ? 'Encontrado' : 'Não encontrado');
    await frame.waitForSelector('#filter\\.dtBaixa', { timeout: 60000, visible: true });
    console.log('Elemento filter.dtBaixa encontrado no iframe com CSS');
    try {
      await page.screenshot({ path: 'screenshot-login-success.png', timeout: 10000 });
      console.log('Captura de tela de sucesso salva em screenshot-login-success.png');
    } catch (screenshotError) {
      console.error('Erro ao tirar captura de tela de sucesso:', screenshotError.message);
    }
    console.log('Login bem-sucedido com cookies!');
    return frame;
  } catch (error) {
    try {
      await page.screenshot({ path: 'screenshot-login-error.png', timeout: 10000 });
      console.log('Captura de tela de erro salva em screenshot-login-error.png');
    } catch (screenshotError) {
      console.error('Erro ao tirar captura de tela de erro:', screenshotError.message);
    }
    console.error('Erro durante o login com cookies:', error);
    throw error;
  }
}

async function registerPayment(page, frame, data) {
  try {
    await page.goto('https://npu2.sienge.com.br/sienge/8/index.html#/common/page/1256', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    await simulateHumanDelay();
    if (!frame) {
      const iframes = await page.$$('iframe');
      if (iframes.length === 0) {
        throw new Error('Nenhum iframe encontrado em registerPayment.');
      }
      frame = await iframes[0].contentFrame();
      console.log('Reutilizando primeiro iframe em registerPayment...');
    }
    const modal = await frame.$('.modal, .overlay, [role="dialog"]');
    if (modal) {
      await frame.evaluate(el => el.remove(), modal);
      console.log('Modal removido no iframe');
      try {
        await page.screenshot({ path: 'screenshot-modal-removed.png', timeout: 10000 });
      } catch (screenshotError) {
        console.error('Erro ao tirar captura de tela após remover modal:', screenshotError.message);
      }
    }
    await frame.waitForSelector('#filter\\.dtBaixa', { timeout: 60000, visible: true });
    console.log('Valor de data.Data:', data.Data, 'Tipo:', typeof data.Data);
    if (!data.Data || typeof data.Data !== 'string') {
      throw new Error(`Valor inválido para data.Data: ${data.Data}. Deve ser uma string no formato DD/MM/AAAA.`);
    }
    await frame.type('#filter\\.dtBaixa', data.Data);
    await simulateHumanDelay();
    const dtBaixaValue = await frame.evaluate(() => document.querySelector('#filter\\.dtBaixa').value);
    console.log(`Valor preenchido em #filter.dtBaixa: ${dtBaixaValue}`);
    try {
      await page.screenshot({ path: 'screenshot-after-dtBaixa.png', timeout: 10000 });
    } catch (screenshotError) {
      console.error('Erro ao tirar captura de tela após dtBaixa:', screenshotError.message);
    }
    let targetFrame = frame;
    const iframes = await page.$$('iframe');
    for (const iframe of iframes) {
      const testFrame = await iframe.contentFrame();
      const element = await testFrame.$('#filter\\.contaCorrente\\.empresa\\.cdEmpresaView');
      if (element) {
        targetFrame = testFrame;
        console.log('Elemento #filter.contaCorrente.empresa.cdEmpresaView encontrado no iframe', iframes.indexOf(iframe));
        break;
      }
    }
    await targetFrame.waitForSelector('#filter\\.contaCorrente\\.empresa\\.cdEmpresaView', { timeout: 60000, visible: true });
    console.log('Valor de data.Empresa:', data.Empresa, 'Tipo:', typeof data.Empresa);
    if (!data.Empresa) {
      throw new Error(`Valor inválido para data.Empresa: ${data.Empresa}. Deve ser uma string ou número.`);
    }
    await targetFrame.type('#filter\\.contaCorrente\\.empresa\\.cdEmpresaView', String(data.Empresa));
    await targetFrame.click('#filter\\.contaCorrente\\.empresa\\.cdEmpresaView');
    await simulateHumanDelay();
    const empresaValue = await targetFrame.evaluate(() => document.querySelector('#filter\\.contaCorrente\\.empresa\\.cdEmpresaView').value);
    console.log(`Valor preenchido em #filter.contaCorrente.empresa.cdEmpresaView: ${empresaValue}`);
    try {
      await page.screenshot({ path: 'screenshot-after-empresa.png', timeout: 10000 });
    } catch (screenshotError) {
      console.error('Erro ao tirar captura de tela após empresa:', screenshotError.message);
    }
    for (const iframe of iframes) {
      const testFrame = await iframe.contentFrame();
      const element = await testFrame.$('#entity\\.contaCorrente\\.contaCorrentePK\\.nuConta');
      if (element) {
        targetFrame = testFrame;
        console.log('Elemento #entity.contaCorrente.contaCorrentePK.nuConta encontrado no iframe', iframes.indexOf(iframe));
        break;
      }
    }
    await targetFrame.waitForSelector('#entity\\.contaCorrente\\.contaCorrentePK\\.nuConta', { timeout: 60000, visible: true });
    console.log('Valor de data.ContaCorrente:', data.ContaCorrente, 'Tipo:', typeof data.ContaCorrente);
    if (!data.ContaCorrente) {
      throw new Error(`Valor inválido para data.ContaCorrente: ${data.ContaCorrente}. Deve ser uma string ou número.`);
    }
    await targetFrame.focus('#entity\\.contaCorrente\\.contaCorrentePK\\.nuConta');
    await targetFrame.click('#entity\\.contaCorrente\\.contaCorrentePK\\.nuConta');
    await targetFrame.evaluate(() => {
      const input = document.querySelector('#entity\\.contaCorrente\\.contaCorrentePK\\.nuConta');
      input.value = '';
    });
    await simulateHumanDelay();
    await targetFrame.type('#entity\\.contaCorrente\\.contaCorrentePK\\.nuConta', String(data.ContaCorrente));
    await simulateHumanDelay();
    const contaCorrenteValue = await targetFrame.evaluate(() => document.querySelector('#entity\\.contaCorrente\\.contaCorrentePK\\.nuConta').value);
    console.log(`Valor preenchido em #entity.contaCorrente.contaCorrentePK.nuConta: ${contaCorrenteValue}`);
    try {
      await page.screenshot({ path: 'screenshot-after-contaCorrente.png', timeout: 10000 });
    } catch (screenshotError) {
      console.error('Erro ao tirar captura de tela após contaCorrente:', screenshotError.message);
    }
    await targetFrame.waitForSelector('#filter\\.cdTipoBaixa', { timeout: 60000, visible: true });
    console.log('Valor de data.TipoBaixa:', data.TipoBaixa, 'Tipo:', typeof data.TipoBaixa);
    if (!['Pagamento', 'Adiantamento', 'Cancelamento', 'Por Bens', 'Outros', 'Abatimento de Adiantamento'].includes(data.TipoBaixa)) {
      throw new Error(`Valor inválido para TipoBaixa: ${data.TipoBaixa}. Use uma das opções: Pagamento, Adiantamento, Cancelamento, Por Bens, Outros, Abatimento de Adiantamento.`);
    }
    await targetFrame.select('#filter\\.cdTipoBaixa', data.TipoBaixa);
    await simulateHumanDelay();
    const tipoBaixaValue = await targetFrame.evaluate(() => {
      const select = document.querySelector('#filter\\.cdTipoBaixa');
      return select ? select.options[select.selectedIndex]?.text : '';
    });
    console.log(`Valor selecionado em #filter.cdTipoBaixa: ${tipoBaixaValue}`);
    try {
      await page.screenshot({ path: 'screenshot-after-tipoBaixa.png', timeout: 10000 });
    } catch (screenshotError) {
      console.error('Erro ao tirar captura de tela após tipoBaixa:', screenshotError.message);
    }
    await targetFrame.waitForSelector('#filter\\.titulo', { timeout: 60000, visible: true });
    console.log('Valor de data.Titulo:', data.Titulo, 'Tipo:', typeof data.Titulo);
    if (!data.Titulo) {
      throw new Error(`Valor inválido para data.Titulo: ${data.Titulo}. Deve ser uma string ou número.`);
    }
    await targetFrame.type('#filter\\.titulo', String(data.Titulo));
    await simulateHumanDelay();
    try {
      await page.screenshot({ path: 'screenshot-after-titulo.png', timeout: 10000 });
    } catch (screenshotError) {
      console.error('Erro ao tirar captura de tela após titulo:', screenshotError.message);
    }
    await targetFrame.waitForSelector('#filter\\.parcela', { timeout: 60000, visible: true });
    console.log('Valor de data.Parcela:', data.Parcela, 'Tipo:', typeof data.Parcela);
    if (!data.Parcela) {
      throw new Error(`Valor inválido para data.Parcela: ${data.Parcela}. Deve ser uma string ou número.`);
    }
    await targetFrame.type('#filter\\.parcela', String(data.Parcela));
    await simulateHumanDelay();
    try {
      await page.screenshot({ path: 'screenshot-after-parcela.png', timeout: 10000 });
    } catch (screenshotError) {
      console.error('Erro ao tirar captura de tela após parcela:', screenshotError.message);
    }
    const consultButtonSelector = '#holderConteudo2 > form > p > span:nth-child(1) > span > input';
    await targetFrame.waitForSelector(consultButtonSelector, { timeout: 60000, visible: true });
    const isButtonEnabled = await targetFrame.evaluate((selector) => {
      const button = document.querySelector(selector);
      return button && !button.disabled && button.offsetParent !== null;
    }, consultButtonSelector);
    console.log(`Botão de consulta ${consultButtonSelector} está habilitado: ${isButtonEnabled}`);
    if (isButtonEnabled) {
      try {
        await targetFrame.click(consultButtonSelector);
        await simulateHumanDelay();
        console.log('Clique no botão de consulta realizado com sucesso');
      } catch (clickError) {
        console.error('Erro ao clicar no botão de consulta:', clickError.message);
      }
      try {
        await page.screenshot({ path: 'screenshot-after-consultar.png', timeout: 10000 });
        console.log('Captura de tela salva em screenshot-after-consultar.png');
      } catch (screenshotError) {
        console.error('Erro ao tirar captura de tela após consultar:', screenshotError.message);
      }
    } else {
      console.log('Botão de consulta não está habilitado. Continuando sem clicar.');
    }
    const selectElementExists = await targetFrame.$('#row\\[0\\]\\.flSelecao_0');
    if (selectElementExists) {
      await targetFrame.click('#row\\[0\\]\\.flSelecao_0');
      await simulateHumanDelay();
      try {
        await page.screenshot({ path: 'screenshot-after-selecao.png', timeout: 10000 });
      } catch (screenshotError) {
        console.error('Erro ao tirar captura de tela após selecao:', screenshotError.message);
      }
      if (data.ExecutarOpcional === 'S') {
        await targetFrame.waitForSelector('#row\\[0\\]\\.editar_0', { timeout: 60000, visible: true });
        await targetFrame.click('#row\\[0\\]\\.editar_0');
        await simulateHumanDelay();
        try {
          await page.screenshot({ path: 'screenshot-after-editar.png', timeout: 10000 });
        } catch (screenshotError) {
          console.error('Erro ao tirar captura de tela após editar:', screenshotError.message);
        }
        if (data.ParcialTotal === 'T') {
          await targetFrame.waitForSelector('#entity\\.flParcialTotalTotal', { timeout: 60000, visible: true });
          await targetFrame.click('#entity\\.flParcialTotalTotal');
        } else if (data.ParcialTotal === 'P') {
          await targetFrame.waitForSelector('#entity\\.flParcialTotalParcial', { timeout: 60000, visible: true });
          await targetFrame.click('#entity\\.flParcialTotalParcial');
          await simulateHumanDelay();
          await targetFrame.waitForSelector('#entity\\.vlPagto', { timeout: 60000, visible: true });
          console.log('Valor de data.Valor:', data.Valor, 'Tipo:', typeof data.Valor);
          if (!data.Valor) {
            throw new Error(`Valor inválido para data.Valor: ${data.Valor}. Deve ser uma string ou número.`);
          }
          await targetFrame.type('#entity\\.vlPagto', String(data.Valor));
        }
        await simulateHumanDelay();
        try {
          await page.screenshot({ path: 'screenshot-after-parcialTotal.png', timeout: 10000 });
        } catch (screenshotError) {
          console.error('Erro ao tirar captura de tela após parcialTotal:', screenshotError.message);
        }
        await targetFrame.waitForSelector('#holderConteudo2 > table:nth-child(3) > tbody > tr > td:nth-child(1) > a', { timeout: 60000, visible: true });
        await targetFrame.click('#holderConteudo2 > table:nth-child(3) > tbody > tr > td:nth-child(1) > a');
        await simulateHumanDelay();
        try {
          await page.screenshot({ path: 'screenshot-after-link1.png', timeout: 10000 });
        } catch (screenshotError) {
          console.error('Erro ao tirar captura de tela após link1:', screenshotError.message);
        }
        await targetFrame.waitForSelector('#entity\\.vlCorMonetaria', { timeout: 60000, visible: true });
        console.log('Valor de data.CorrecaoMonetaria:', data.CorrecaoMonetaria, 'Tipo:', typeof data.CorrecaoMonetaria);
        if (!data.CorrecaoMonetaria && data.CorrecaoMonetaria !== 0) {
          throw new Error(`Valor inválido para data.CorrecaoMonetaria: ${data.CorrecaoMonetaria}. Deve ser uma string ou número.`);
        }
        await targetFrame.type('#entity\\.vlCorMonetaria', String(data.CorrecaoMonetaria));
        await simulateHumanDelay();
        try {
          await page.screenshot({ path: 'screenshot-after-corMonetaria.png', timeout: 10000 });
        } catch (screenshotError) {
          console.error('Erro ao tirar captura de tela após corMonetaria:', screenshotError.message);
        }
        await targetFrame.waitForSelector('#entity\\.vlJuros', { timeout: 60000, visible: true });
        console.log('Valor de data.Juros:', data.Juros, 'Tipo:', typeof data.Juros);
        if (!data.Juros && data.Juros !== 0) {
          throw new Error(`Valor inválido para data.Juros: ${data.Juros}. Deve ser uma string ou número.`);
        }
        await targetFrame.type('#entity\\.vlJuros', String(data.Juros));
        await simulateHumanDelay();
        try {
          await page.screenshot({ path: 'screenshot-after-juros.png', timeout: 10000 });
        } catch (screenshotError) {
          console.error('Erro ao tirar captura de tela após juros:', screenshotError.message);
        }
        await targetFrame.waitForSelector('#entity\\.vlMulta', { timeout: 60000, visible: true });
        console.log('Valor de data.Multa:', data.Multa, 'Tipo:', typeof data.Multa);
        if (!data.Multa && data.Multa !== 0) {
          throw new Error(`Valor inválido para data.Multa: ${data.Multa}. Deve ser uma string ou número.`);
        }
        await targetFrame.type('#entity\\.vlMulta', String(data.Multa));
        await simulateHumanDelay();
        try {
          await page.screenshot({ path: 'screenshot-after-multa.png', timeout: 10000 });
        } catch (screenshotError) {
          console.error('Erro ao tirar captura de tela após multa:', screenshotError.message);
        }
        await targetFrame.waitForSelector('#holderConteudo2 > form > p > span > span > input', { timeout: 60000, visible: true });
        await targetFrame.click('#holderConteudo2 > form > p > span > span > input');
        await simulateHumanDelay();
        try {
          await page.screenshot({ path: 'screenshot-after-save.png', timeout: 10000 });
        } catch (screenshotError) {
          console.error('Erro ao tirar captura de tela após save:', screenshotError.message);
        }
        await targetFrame.waitForSelector('#holderConteudo2 > table:nth-child(1) > tbody > tr > td:nth-child(1) > a', { timeout: 60000, visible: true });
        await targetFrame.click('#holderConteudo2 > table:nth-child(1) > tbody > tr > td:nth-child(1) > a');
        await simulateHumanDelay();
        try {
          await page.screenshot({ path: 'screenshot-after-link2.png', timeout: 10000 });
        } catch (screenshotError) {
          console.error('Erro ao tirar captura de tela após link2:', screenshotError.message);
        }
      }
      await targetFrame.waitForSelector('#botaoSalvar', { timeout: 60000, visible: true });
      await targetFrame.click('#botaoSalvar');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
      try {
        await page.screenshot({ path: 'screenshot-after-baixa.png', timeout: 10000 });
      } catch (screenshotError) {
        console.error('Erro ao tirar captura de tela após baixa:', screenshotError.message);
      }
    } else {
      console.log(`Nenhum resultado encontrado para Título ${data.Titulo}, Parcela ${data.Parcela}`);
    }
  } catch (error) {
    try {
      await page.screenshot({ path: `screenshot-register-error-${data.Titulo}-${data.Parcela}.png`, timeout: 10000 });
      console.log(`Captura de tela de erro salva em screenshot-register-error-${data.Titulo}-${data.Parcela}.png`);
    } catch (screenshotError) {
      console.error('Erro ao tirar captura de tela de erro:', screenshotError.message);
    }
    console.error(`Erro ao processar Título ${data.Titulo}, Parcela ${data.Parcela}:`, error);
    throw error;
  }
}

async function processPayments(data, cookiesFilePath) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    protocolTimeout: 90000 // Aumentado para 90 segundos
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
    console.error('Erro em processPayments:', error);
    return { success: false, message: `Erro durante o processamento: ${error.message}` };
  } finally {
    await browser.close();
  }
}

module.exports = { processPayments };
