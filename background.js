// 存储已加载内容脚本的标签页ID
const loadedTabs = new Set();

// 检查URL是否允许注入内容脚本
function isInjectableUrl(url) {
  try {
    const urlObj = new URL(url);
    // 不允许在chrome://, chrome-extension://, edge://, about: 等页面注入
    return !urlObj.protocol.startsWith('chrome:') && 
           !urlObj.protocol.startsWith('edge:') && 
           !urlObj.protocol.startsWith('about:') &&
           !urlObj.protocol.startsWith('chrome-extension:');
  } catch (e) {
    console.error('URL解析错误：', e);
    return false;
  }
}

// 监听来自content script的初始化消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'contentScriptReady' && sender.tab) {
    console.log('标签页已加载内容脚本：', sender.tab.id);
    loadedTabs.add(sender.tab.id);
    sendResponse({success: true});
  }
});

// 监听标签页关闭事件
chrome.tabs.onRemoved.addListener((tabId) => {
  loadedTabs.delete(tabId);
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('收到消息：', message);
  if (message.time) {
    // 清除之前的闹钟
    chrome.alarms.clear('timerAlarm', () => {
      // 创建新的闹钟
      chrome.alarms.create('timerAlarm', {
        delayInMinutes: message.time / 60000 // 将毫秒转换为分钟
      }, (alarm) => {
        if (chrome.runtime.lastError) {
          console.error('创建闹钟失败：', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('闹钟创建成功：', alarm);
          sendResponse({ success: true });
        }
      });
    });
    return true; // 保持消息通道开放，以便异步响应
  }
});

// 向标签页发送消息的函数
async function sendMessageToTab(tabId, message, retries = 3) {
  try {
    // 获取标签页信息
    const tab = await chrome.tabs.get(tabId);
    
    // 检查URL是否允许注入
    if (!isInjectableUrl(tab.url)) {
      console.log('当前页面不允许注入内容脚本：', tab.url);
      return false;
    }

    // 如果标签页已经加载了内容脚本，直接发送消息
    if (loadedTabs.has(tabId)) {
      try {
        const response = await chrome.tabs.sendMessage(tabId, message);
        return response && response.success;
      } catch (error) {
        console.error('发送消息失败：', error);
        return false;
      }
    }

    // 如果标签页没有加载内容脚本，尝试重新注入
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      loadedTabs.add(tabId);
      
      // 等待一小段时间确保脚本加载完成
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 再次尝试发送消息
      const response = await chrome.tabs.sendMessage(tabId, message);
      return response && response.success;
    } catch (error) {
      console.error('注入内容脚本失败：', error);
      return false;
    }
  } catch (error) {
    console.error('获取标签页信息失败：', error);
    return false;
  }
}

// 更新标签页标题
function updateTabTitle() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0]) {
      const originalTitle = tabs[0].title;
      let count = 0;
      const interval = setInterval(() => {
        count++;
        chrome.tabs.update(tabs[0].id, {
          title: count % 2 === 0 ? '⏰ 时间到！' : originalTitle
        });
        if (count >= 10) {
          clearInterval(interval);
          chrome.tabs.update(tabs[0].id, {title: originalTitle});
        }
      }, 500);
    }
  });
}

// 闹钟触发时的处理
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('闹钟触发：', alarm);
  if (alarm.name === 'timerAlarm') {
    // 检查通知权限
    chrome.notifications.getPermissionLevel((level) => {
      console.log('通知权限级别：', level);
      if (level === 'granted') {
        // 1. 发送桌面通知
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: '时间到！',
          message: '您设置的计时器已完成',
          priority: 2
        }, (notificationId) => {
          if (chrome.runtime.lastError) {
            console.error('创建通知失败：', chrome.runtime.lastError);
          } else {
            console.log('通知创建成功，ID：', notificationId);
          }
        });

        // 2. 使用语音提醒
        chrome.tts.speak('时间到！您的计时器已完成', {
          lang: 'zh-CN',
          rate: 1.0,
          onEvent: function(event) {
            if (event.type === 'end') {
              console.log('语音提醒结束');
            }
          }
        });

        // 3. 向当前活动标签页发送消息以显示提醒
        chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
          if (tabs[0]) {
            const success = await sendMessageToTab(tabs[0].id, {type: 'showAlert'});
            if (!success) {
              console.log('无法在当前标签页显示提醒，可能是在特殊页面或扩展页面');
            }
          }
        });

        // 清除闹钟
        chrome.alarms.clear('timerAlarm');
      } else {
        console.error('通知权限未授予，当前级别：', level);
      }
    });
  }
});