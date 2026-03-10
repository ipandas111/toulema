// 投了吗浏览器扩展 - Popup 脚本

document.addEventListener('DOMContentLoaded', () => {
  const jobList = document.getElementById('jobList')
  const jobCount = document.getElementById('jobCount')
  const syncBtn = document.getElementById('syncBtn')
  const clearBtn = document.getElementById('clearBtn')

  // 加载记录
  function loadJobs() {
    chrome.storage.local.get(['toulema_jobs'], (result) => {
      const jobs = result.toulema_jobs || []
      jobCount.textContent = jobs.length

      if (jobs.length === 0) {
        jobList.innerHTML = '<div class="empty">暂无记录的投递</div>'
        return
      }

      jobList.innerHTML = jobs.map(job => `
        <div class="job-item">
          <div class="company">${job.company || '未知公司'}</div>
          <div class="position">${job.position || '未知岗位'}</div>
          <div class="meta">${job.city || ''} · ${formatDate(job.created_at)}</div>
        </div>
      `).join('')
    })
  }

  // 格式化日期
  function formatDate(isoString) {
    if (!isoString) return ''
    const date = new Date(isoString)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  // 同步到网站
  syncBtn.addEventListener('click', () => {
    chrome.storage.local.get(['toulema_jobs'], (result) => {
      const jobs = result.toulema_jobs || []

      if (jobs.length === 0) {
        alert('没有可同步的记录')
        return
      }

      // 将数据编码并打开网站
      const data = JSON.stringify(jobs)
      const encoded = btoa(encodeURIComponent(data))

      // 打开投了吗网站并传递数据
      window.open(`https://frontend-opal-one-64.vercel.app/?import=${encoded}`, '_blank')
    })
  })

  // 清空记录
  clearBtn.addEventListener('click', () => {
    if (confirm('确定要清空所有记录吗？')) {
      chrome.storage.local.set({ toulema_jobs: [] }, () => {
        loadJobs()
      })
    }
  })

  // 初始化
  loadJobs()
})
