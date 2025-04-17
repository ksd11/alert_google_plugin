document.getElementById('setTimer').addEventListener('click', () => {
  const seconds = document.getElementById('seconds').value;
  if (seconds && seconds > 0) {
    try {
      console.log('正在发送消息，时间：', seconds * 1000);
      chrome.runtime.sendMessage({ time: seconds * 1000 }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Chrome运行时错误：', chrome.runtime.lastError);
          alert('设置失败：' + chrome.runtime.lastError.message);
        } else if (response && response.success) {
          console.log('消息发送成功');
          alert('提醒已设置！将在 ' + seconds + ' 秒后提醒您');
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