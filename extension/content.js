// 投了吗 - 职位信息解析器

function getJobInfo() {
  var url = window.location.href;
  var title = document.title;
  var info = { company: '', position: '', city: '', url: url, platform: '招聘平台' };

  // 根据域名判断平台和公司
  if (url.indexOf('xiaopeng') !== -1) {
    info.company = '小鹏汽车';
    info.platform = '小鹏招聘';
  } else if (url.indexOf('xiaomi') !== -1) {
    info.company = '小米';
    info.platform = '小米招聘';
  } else if (url.indexOf('zhipin') !== -1) {
    info.platform = 'BOSS直聘';
  } else if (url.indexOf('liepin') !== -1) {
    info.platform = '猎聘';
  } else if (url.indexOf('lagou') !== -1) {
    info.platform = '拉勾网';
  } else if (url.indexOf('feishu') !== -1) {
    info.platform = '飞书招聘';
  }

  // 尝试从页面标题提取
  var parts = title.split(/[-|—–]/);
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i].trim();
    if (part.length > 1 && part.length < 50) {
      info.position = part;
      break;
    }
  }

  // 尝试从 h1 获取
  var h1 = document.querySelector('h1');
  if (h1 && !info.position) {
    info.position = h1.textContent.trim();
  }

  // 尝试获取城市
  var cityEl = document.querySelector('[class*="city"], [class*="location"], [class*="地点"]');
  if (cityEl) {
    info.city = cityEl.textContent.trim();
  }

  // 尝试获取公司名
  var companyEl = document.querySelector('.company-name, [class*="company-name"], .company-info');
  if (companyEl && !info.company) {
    info.company = companyEl.textContent.trim();
  }

  return info;
}

function createButton() {
  var existing = document.getElementById('toulema-float-btn');
  if (existing) {
    existing.remove();
  }

  var jobInfo = getJobInfo();

  var container = document.createElement('div');
  container.id = 'toulema-float-btn';

  var style = document.createElement('style');
  style.textContent = [
    '#toulema-float-btn { position: fixed; bottom: 20px; right: 20px; z-index: 99999; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }',
    '#toulema-float-btn .btn { width: 60px; height: 60px; border-radius: 16px; background: #FF9F0A; color: white; border: none; cursor: pointer; box-shadow: 0 4px 20px rgba(255,159,10,0.4); display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 20px; }',
    '#toulema-float-btn .btn span { font-size: 10px; font-weight: 600; margin-top: 2px; }',
    '#toulema-float-btn .panel { position: absolute; bottom: 70px; right: 0; width: 280px; background: white; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.15); padding: 20px; display: none; }',
    '#toulema-float-btn .panel.show { display: block; }',
    '#toulema-float-btn .panel h3 { margin: 0 0 16px 0; font-size: 16px; font-weight: 600; }',
    '#toulema-float-btn .panel .field { margin-bottom: 12px; }',
    '#toulema-float-btn .panel label { display: block; font-size: 12px; color: #86868B; margin-bottom: 4px; }',
    '#toulema-float-btn .panel input { width: 100%; padding: 10px; border: 1px solid #E5E5E7; border-radius: 8px; font-size: 14px; box-sizing: border-box; }',
    '#toulema-float-btn .panel .actions { display: flex; gap: 10px; margin-top: 16px; }',
    '#toulema-float-btn .panel button { flex: 1; padding: 10px; border-radius: 8px; font-size: 14px; cursor: pointer; border: none; }',
    '#toulema-float-btn .panel .save-btn { background: #FF9F0A; color: white; }',
    '#toulema-float-btn .panel .close-btn { background: #F5F5F7; color: #1D1D1F; }',
    '#toulema-float-btn .panel .success { color: #10B981; font-size: 13px; text-align: center; margin-top: 12px; }'
  ].join('');
  container.appendChild(style);

  var btn = document.createElement('button');
  btn.className = 'btn';
  btn.innerHTML = '📝<span>记录投递</span>';
  container.appendChild(btn);

  var panel = document.createElement('div');
  panel.className = 'panel';
  panel.innerHTML = [
    '<h3>📝 记录投递</h3>',
    '<div class="field"><label>公司名称</label><input type="text" class="company-input" placeholder="例如：小鹏汽车"></div>',
    '<div class="field"><label>岗位名称</label><input type="text" class="position-input" placeholder="例如：产品经理"></div>',
    '<div class="field"><label>城市（可选）</label><input type="text" class="city-input" placeholder="例如：北京"></div>',
    '<div class="actions"><button class="close-btn">取消</button><button class="save-btn">保存</button></div>',
    '<div class="success"></div>'
  ].join('');
  container.appendChild(panel);

  document.body.appendChild(container);

  // 填充数据
  var companyInput = panel.querySelector('.company-input');
  var positionInput = panel.querySelector('.position-input');
  var cityInput = panel.querySelector('.city-input');
  var successMsg = panel.querySelector('.success');

  companyInput.value = jobInfo.company || '';
  positionInput.value = jobInfo.position || '';
  cityInput.value = jobInfo.city || '';

  // 点击按钮显示/隐藏面板
  btn.onclick = function(e) {
    e.stopPropagation();
    panel.classList.toggle('show');
    successMsg.textContent = '';
  };

  // 关闭按钮
  panel.querySelector('.close-btn').onclick = function() {
    panel.classList.remove('show');
  };

  // 保存按钮 - 保存到 localStorage（与网站共享）
  panel.querySelector('.save-btn').onclick = function() {
    var job = {
      id: crypto.randomUUID(),
      company: companyInput.value,
      position: positionInput.value,
      city: cityInput.value,
      url: window.location.href,
      platform: jobInfo.platform,
      status: '待投递',
      created_at: new Date().toISOString()
    };

    // 同步 userId
    var userId = localStorage.getItem('toulema_local_user');
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem('toulema_local_user', userId);
    }

    // 保存到 localStorage（网站可以读取）
    var allJobs = JSON.parse(localStorage.getItem('toulema_jobs') || '{}');
    var jobs = allJobs[userId] || [];
    jobs.unshift(job);
    allJobs[userId] = jobs;
    localStorage.setItem('toulema_jobs', JSON.stringify(allJobs));

    // 同时保存到 Chrome storage（扩展内部使用）
    chrome.storage.local.get(['toulema_jobs'], function(result) {
      var extJobs = result.toulema_jobs || [];
      extJobs.unshift(job);
      chrome.storage.local.set({ toulema_jobs: extJobs });
    });

    // 通知 popup 更新显示
    chrome.runtime.sendMessage({ type: 'JOB_SAVED', job: job });

    successMsg.textContent = '✅ 已保存';
    setTimeout(function() {
      panel.classList.remove('show');
    }, 1500);
  };

  // 点击其他地方关闭
  document.onclick = function(e) {
    if (!container.contains(e.target)) {
      panel.classList.remove('show');
    }
  };
}

// 页面加载完成后创建按钮
if (document.readyState === 'complete') {
  createButton();
} else {
  window.addEventListener('load', createButton);
}
