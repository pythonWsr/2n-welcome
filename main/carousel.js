// main/carousel.js – 首页轮播（从 data/home/medialist.json 动态加载媒体列表）
(function() {
  const track = document.getElementById('carouselTrack');
  const dotsContainer = document.getElementById('carouselDots');
  const prevBtn = document.getElementById('carouselPrev');
  const nextBtn = document.getElementById('carouselNext');

  if (!track || !dotsContainer || !prevBtn || !nextBtn) return;

  let currentIndex = 0;
  let autoTimer = null;
  let isVideoPlaying = false;

  // 加载媒体列表并初始化轮播
  async function initCarousel() {
    try {
      const res = await fetch('./data/home/medialist.json');
      if (!res.ok) throw new Error('媒体列表加载失败');
      const carouselData = await res.json();
      buildCarousel(carouselData);
    } catch (e) {
      console.error('轮播初始化失败:', e);
      track.innerHTML = '<div class="loading-placeholder">媒体加载失败</div>';
    }
  }

  function buildCarousel(carouselData) {
    // 清空 track
    track.innerHTML = '';

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
        video.controls = true;
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
          console.warn('视频自动播放失败:', e);
        });
        stopAuto();
        isVideoPlaying = true;
      } else {
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
      isVideoPlaying = false;
      next();
    }

    function startAuto() {
      stopAuto();
      if (isVideoPlaying) return;
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
  }

  // 启动
  initCarousel();
})();
