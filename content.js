console.log('内容脚本已加载');

// 向background发送初始化消息
chrome.runtime.sendMessage({type: 'contentScriptReady'});

// 监听来自background的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('内容脚本收到消息：', message);
  if (message.type === 'showAlert') {
    try {
      // 创建提醒元素
      const alert = document.createElement('div');
      alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #ff4444;
        color: white;
        padding: 15px 25px;
        border-radius: 5px;
        z-index: 999999;
        font-size: 16px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        animation: fadeInOut 5s ease-in-out;
      `;
      alert.textContent = '⏰ 时间到！';
      
      // 添加动画样式
      const style = document.createElement('style');
      style.textContent = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-20px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
      `;
      document.head.appendChild(style);
      
      // 添加提醒元素到页面
      document.body.appendChild(alert);
      
      // 5秒后移除提醒
      setTimeout(() => {
        alert.remove();
        style.remove();
      }, 5000);

      // 发送成功响应
      sendResponse({success: true});
    } catch (error) {
      console.error('显示提醒时出错：', error);
      sendResponse({success: false, error: error.message});
    }
  }
  return true; // 保持消息通道开放
}); 