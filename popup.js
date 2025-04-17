// 加载设置
document.addEventListener('DOMContentLoaded', () => {
  // 读取语音提醒设置
  chrome.storage.sync.get(['voiceAlert'], (result) => {
    document.getElementById('voiceAlert').checked = result.voiceAlert !== false;
  });
});

// 保存语音提醒设置
document.getElementById('voiceAlert').addEventListener('change', (e) => {
  chrome.storage.sync.set({ voiceAlert: e.target.checked });
});

// 获取选中的时间单位
function getSelectedTimeUnit() {
  return document.querySelector('input[name="timeUnit"]:checked').value;
}

// 转换时间为毫秒
function convertToMilliseconds(value, unit) {
  if (unit === 'minutes') {
    return value * 60 * 1000;
  }
  return value * 1000;
}

// 格式化时间显示
function formatTimeDisplay(value, unit) {
  if (unit === 'minutes') {
    return `${value} 分钟`;
  }
  return `${value} 秒`;
}

document.getElementById('setTimer').addEventListener('click', () => {
  const timeValue = document.getElementById('timeValue').value;
  const timeUnit = getSelectedTimeUnit();
  
  if (timeValue && timeValue > 0) {
    try {
      const milliseconds = convertToMilliseconds(parseInt(timeValue), timeUnit);
      console.log('正在发送消息，时间：', milliseconds);
      
      chrome.runtime.sendMessage({ 
        time: milliseconds,
        voiceAlert: document.getElementById('voiceAlert').checked
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Chrome运行时错误：', chrome.runtime.lastError);
          alert('设置失败：' + chrome.runtime.lastError.message);
        } else if (response && response.success) {
          console.log('消息发送成功');
          alert('提醒已设置！将在 ' + formatTimeDisplay(timeValue, timeUnit) + ' 后提醒您');
        } else if (response && response.error) {
          console.error('设置失败：', response.error);
          alert('设置失败：' + response.error);
        } else {
          console.log('消息发送成功，但没有收到有效响应');
          alert('提醒已设置！');
        }
      });
    } catch (error) {
      console.error('捕获到错误：', error);
      alert('设置失败：' + error.message);
    }
  } else {
    alert('请输入有效的时间！');
  }
});