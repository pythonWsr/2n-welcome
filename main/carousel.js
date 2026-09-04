// main/carousel.js – 首页轮播（图片/视频混合，自动播放）
(function() {
  const carouselData = [
    {
      type: 'image',
      src: './data/home/Awdc-petal.png',
      alt: '花瓣图片'
    },
    {
      type: 'video',
      src: './data/home/[florr]2n公会半周年纪念！.mp4'
    }
  ];

  const track = document.getElementById('carouselTrack');
  const dotsContainer = document.getElementById('carouselDots');
  const prevBtn = document.getElementById('carouselPrev');
  const nextBtn = document.getElementById('carouselNext');

  if (!track || !dotsContainer || !prevBtn || !nextBtn) return;

  let currentIndex = 0;
  let autoTimer = null;
  let isVideoPlaying = false;

  // 创建轮播项
  carouselData.forEach((item, index) => {
    const slide = document.createElement('div');
    slide.className = 'carousel-slide';

    if (item.type === 'image') {
      const img = document.createElement('img');
      img.src = item.src;
      img.alt = item.alt || '';
      slide.appendChild(img);
    } else if (item.type === 'video') {
      const video = document.createElement('video');
      video.src = item.src;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('muted', '');
      video.addEventListener('ended', onVideoEnded);
      video.addEventListener('play', () => { isVideoPlaying = true; });
      video.addEventListener('pause', () => { isVideoPlaying = false; });
      slide.appendChild(video);
    }

    track.appendChild(slide);
  });

  const slides = track.querySelectorAll('.carousel-slide');

  // 创建指示点
  carouselData.forEach((_, index) => {
    const dot = document.createElement('span');
    dot.className = 'carousel-dot';
    dot.addEventListener('click', () => goTo(index));
    dotsContainer.appendChild(dot);
  });
  const dots = dotsContainer.querySelectorAll('.carousel-dot');

  function updateDots() {
    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index === currentIndex);
    });
  }

  function goTo(index) {
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;
    currentIndex = index;
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    updateDots();

    // 停止所有视频
    slides.forEach((slide, i) => {
      const video = slide.querySelector('video');
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
    });

    // 如果当前是视频，自动播放
    const currentSlide = slides[currentIndex];
    const video = currentSlide.querySelector('video');
    if (video) {
      video.play().catch(e => {
        // 如果自动播放被阻止，可以静默处理或显示提示
        console.warn('视频自动播放失败:', e);
      });
      // 暂停自动计时器，等待视频结束
      stopAuto();
      isVideoPlaying = true;
    } else {
      // 当前是图片，重置自动计时器
      isVideoPlaying = false;
      startAuto();
    }
  }

  function next() {
    goTo(currentIndex + 1);
  }

  function prev() {
    goTo(currentIndex - 1);
  }

  function onVideoEnded() {
    // 视频播放完毕，切换到下一张
    isVideoPlaying = false;
    next();
  }

  function startAuto() {
    stopAuto();
    if (isVideoPlaying) return; // 视频播放中不启动计时器
    autoTimer = setInterval(() => {
      next();
    }, 6000); // 6秒自动翻页
  }

  function stopAuto() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  // 事件绑定
  nextBtn.addEventListener('click', () => {
    stopAuto();
    next();
  });

  prevBtn.addEventListener('click', () => {
    stopAuto();
    prev();
  });

  // 初始化
  goTo(0);
})();
