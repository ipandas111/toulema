import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('1. 打开网站...');
  await page.goto('https://toulema.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // 登录
  let bodyText = await page.locator('body').innerText();
  if (bodyText.includes('没有账号？注册')) {
    await page.click('button:has-text("没有账号？注册")');
    await page.waitForTimeout(500);
  }
  await page.fill('input[placeholder="输入用户名"]', 'anan');
  await page.click('button:has-text("注册")');
  await page.waitForTimeout(2000);

  console.log('2. 添加第一个投递：网易产品经理...');
  // 点击顶部的添加投递按钮
  await page.locator('header button:has-text("添加投递")').click();
  await page.waitForTimeout(1000);

  // 填写公司名 - 在 modal 中的
  await page.locator('.modal-panel input[placeholder="如：德州仪器"]').fill('网易');
  // 填写岗位
  await page.locator('.modal-panel input[placeholder="如：TSE"]').fill('产品经理');

  // 点击 modal 中的添加按钮 (最后一个按钮)
  await page.locator('.modal-panel button:has-text("添加")').click();
  await page.waitForTimeout(1000);

  console.log('3. 添加第二个投递：科大讯飞产品...');
  await page.locator('header button:has-text("添加投递")').click();
  await page.waitForTimeout(1000);

  await page.locator('.modal-panel input[placeholder="如：德州仪器"]').fill('科大讯飞');
  await page.locator('.modal-panel input[placeholder="如：TSE"]').fill('产品经理');
  await page.locator('.modal-panel button:has-text("添加")').click();
  await page.waitForTimeout(1000);

  // 验证结果
  await page.screenshot({ path: '/Users/terry/Desktop/投了吗/result.png' });
  bodyText = await page.locator('body').innerText();

  if (bodyText.includes('网易') && bodyText.includes('科大讯飞')) {
    console.log('✅ 测试成功：已添加网易和科大讯飞的投递');
  } else {
    console.log('⚠️ 请手动验证');
  }

  console.log('页面内容:', bodyText.substring(0, 500));

  await browser.close();
  console.log('测试完成');
})();
