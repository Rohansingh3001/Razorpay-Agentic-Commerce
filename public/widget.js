(function () {
  // Config
  const RAZORBUY_URL = 'http://localhost:3000/embed'; // Point to deployed URL in production

  // Create Styles
  const style = document.createElement('style');
  style.innerHTML = `
    #rzb-widget-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: system-ui, -apple-system, sans-serif;
    }
    #rzb-toggle-btn {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #000;
      color: #CCFF00; /* Neon Yellow */
      border: 4px solid #fff;
      box-shadow: 4px 4px 0 #000;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      transition: transform 0.2s;
    }
    #rzb-toggle-btn:hover {
      transform: translate(-2px, -2px);
      box-shadow: 6px 6px 0 #000;
    }
    #rzb-iframe-container {
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 400px;
      height: 600px;
      max-height: calc(100vh - 120px);
      max-width: calc(100vw - 40px);
      background: #fff;
      border: 4px solid #000;
      box-shadow: 8px 8px 0 #000;
      border-radius: 8px;
      overflow: hidden;
      display: none;
      flex-direction: column;
    }
    #rzb-iframe-container.open {
      display: flex;
    }
    #rzb-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    @media (max-width: 480px) {
      #rzb-iframe-container {
        width: calc(100vw - 40px);
        height: calc(100vh - 120px);
      }
    }
  `;
  document.head.appendChild(style);

  // Create Container
  const container = document.createElement('div');
  container.id = 'rzb-widget-container';
  
  // Create Iframe Container
  const iframeContainer = document.createElement('div');
  iframeContainer.id = 'rzb-iframe-container';
  
  const iframe = document.createElement('iframe');
  iframe.id = 'rzb-iframe';
  iframe.src = RAZORBUY_URL;
  iframe.allow = "payment";
  iframeContainer.appendChild(iframe);

  // Create Toggle Button
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'rzb-toggle-btn';
  toggleBtn.innerHTML = '⚡';
  
  let isOpen = false;
  toggleBtn.onclick = () => {
    isOpen = !isOpen;
    if (isOpen) {
      iframeContainer.classList.add('open');
      toggleBtn.innerHTML = '✕';
    } else {
      iframeContainer.classList.remove('open');
      toggleBtn.innerHTML = '⚡';
    }
  };

  container.appendChild(iframeContainer);
  container.appendChild(toggleBtn);
  document.body.appendChild(container);
})();
