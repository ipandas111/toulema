import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('1. 打开网站...');
  await page.goto('https://toulema.vercel.app/');
  await page.waitForLoadState('networkidle');

  // 截图
  await page.screenshot({ path: '/Users/terry/Desktop/投了吗/screenshot1.png' });
  console.log('截图保存到 screenshot1.png');

  console.log('2. 注册用户 anan...');
  await page.fill('input[placeholder="输入用户名"]', 'anan');
  await page.click('button:has-text("注册")');

  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/Users/terry/Desktop/投了吗/screenshot2.png' });
  console.log('截图保存到 screenshot2.png');

  // 打印页面标题
  console.log('页面标题:', await page.title());

  // 打印所有按钮
  const buttons = await page.locator('button').allTextContents();
  console.log('所有按钮:', buttons);

  await browser.close();
})();
