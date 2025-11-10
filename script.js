// Отслеживание скролла и изменение border-radius слайдов и overlay
document.addEventListener('DOMContentLoaded', function() {
    const slides = document.querySelectorAll('.slide');
    const maxBorderRadius = 200; // Максимальный border-radius
    const minBorderRadius = 0; // Минимальный border-radius
    
    // Сохраняем начальные позиции слайдов в документе
    let slideInitialPositions = [];
    
    function initializePositions() {
        slideInitialPositions = [];
        let cumulativeHeight = 0;
        slides.forEach((slide) => {
            slideInitialPositions.push(cumulativeHeight);
            cumulativeHeight += slide.offsetHeight || window.innerHeight;
        });
    }
    
    // Функция для обновления border-radius и overlay
    function updateOnScroll() {
        const scrollY = window.scrollY || window.pageYOffset;
        const windowHeight = window.innerHeight;
        
        slides.forEach((slide, index) => {
            const overlay = slide.querySelector('.slide-overlay');
            const rect = slide.getBoundingClientRect();
            const slideTopViewport = rect.top; // Позиция относительно viewport
            const slideHeight = slide.offsetHeight || windowHeight;
            const slideStartPos = slideInitialPositions[index] || (index * slideHeight);
            
            // Border-radius: для первого слайда всегда 0, для остальных - динамический
            if (index === 0) {
                // Первый слайд - всегда без округления
                slide.style.borderRadius = '0';
            } else {
                // Для остальных слайдов: радиус плавно уменьшается от 100px до 0
                // при приближении слайда к верху окна
                
                // Используем позицию слайда в viewport для вычисления прогресса
                // Это работает для sticky элементов: когда слайд только появляется снизу,
                // его slideTopViewport близок к windowHeight, и радиус максимальный.
                // По мере прокрутки slideTopViewport уменьшается, и радиус плавно уменьшается.
                // Когда slideTopViewport <= 0 (слайд прилип), радиус = 0.
                
                let progress = 0;
                
                // Определяем диапазон, в котором радиус должен изменяться
                // Радиус начинает уменьшаться, когда слайд появляется на экране
                // и полностью уменьшается, когда слайд прилипает к верху
                const startFadeDistance = windowHeight; // Начинаем уменьшать, когда слайд на этой высоте
                const endFadeDistance = 0; // Заканчиваем уменьшать, когда слайд прилип
                
                if (slideTopViewport >= startFadeDistance) {
                    // Слайд еще не виден или только начинает появляться - радиус максимальный
                    progress = 0;
                } else if (slideTopViewport <= endFadeDistance) {
                    // Слайд прилип к верху - радиус минимальный
                    progress = 1;
                } else {
                    // Слайд виден на экране - плавное изменение progress от 0 до 1
                    // progress = 0 когда slideTopViewport = startFadeDistance (windowHeight)
                    // progress = 1 когда slideTopViewport = endFadeDistance (0)
                    progress = (startFadeDistance - slideTopViewport) / startFadeDistance;
                    progress = Math.max(0, Math.min(1, progress)); // Ограничиваем от 0 до 1
                }
                
                // Вычисляем border-radius: progress = 0 -> radius = 100px, progress = 1 -> radius = 0px
                const borderRadius = maxBorderRadius * (1 - progress);
                const currentRadius = Math.max(Math.min(borderRadius, maxBorderRadius), minBorderRadius);
                slide.style.borderRadius = `${currentRadius}px ${currentRadius}px 0 0`;
            }
            
            // Overlay: становится темнее, когда начинает появляться следующий слайд
            if (overlay) {
                let overlayOpacity = 0;
                
                // Если есть следующий слайд
                if (index < slides.length - 1) {
                    const nextSlide = slides[index + 1];
                    const nextRect = nextSlide.getBoundingClientRect();
                    const nextSlideTop = nextRect.top;
                    
                    // Когда следующий слайд начинает появляться снизу экрана
                    if (nextSlideTop < windowHeight && nextSlideTop > 0) {
                        // Следующий слайд виден внизу экрана
                        // Вычисляем прогресс: когда nextSlideTop = windowHeight, opacity = 0
                        // когда nextSlideTop = 0, opacity = максимум
                        const progress = 1 - (nextSlideTop / windowHeight);
                        overlayOpacity = progress * 0.7; // Максимальная непрозрачность 0.7
                    } else if (nextSlideTop <= 0) {
                        // Следующий слайд уже прилип к верху или выше
                        overlayOpacity = 0.7; // Максимальная затемненность
                    }
                }
                
                overlay.style.opacity = overlayOpacity;
            }
        });
    }
    
    // Перелистывание по слайдам (wheel/keys/touch)
    let isSnapping = false;
    let targetIndex = 0;
    
    function getCurrentSlideIndex(scrollTop) {
        const y = scrollTop == null ? (window.scrollY || window.pageYOffset) : scrollTop;
        let idx = 0;
        for (let i = 0; i < slideInitialPositions.length; i++) {
            if (y >= slideInitialPositions[i]) idx = i;
        }
        return idx;
    }
    
    function scrollToSlide(index) {
        const clamped = Math.max(0, Math.min(index, slides.length - 1));
        targetIndex = clamped;
        isSnapping = true;
        window.scrollTo({ top: slideInitialPositions[clamped], behavior: 'smooth' });
        // Сбрасываем флаг после окончания анимации
        setTimeout(() => { isSnapping = false; }, 600);
    }
    
    // Wheel (desktop)
    window.addEventListener('wheel', function(e) {
        // Интерцепт только когда не в процессе снапа, чтобы не накапливать команды
        if (isSnapping) {
            e.preventDefault();
            return;
        }
        // Предотвращаем дефолтный скролл для пошагового перелистывания
        e.preventDefault();
        const idx = getCurrentSlideIndex();
        if (e.deltaY > 0) {
            scrollToSlide(idx + 1);
        } else if (e.deltaY < 0) {
            scrollToSlide(idx - 1);
        }
    }, { passive: false });
    
    // Keys
    window.addEventListener('keydown', function(e) {
        if (isSnapping) return;
        const keysNext = ['ArrowDown', 'PageDown', 'Space'];
        const keysPrev = ['ArrowUp', 'PageUp'];
        const idx = getCurrentSlideIndex();
        if (keysNext.includes(e.code)) {
            e.preventDefault();
            scrollToSlide(idx + 1);
        } else if (keysPrev.includes(e.code)) {
            e.preventDefault();
            scrollToSlide(idx - 1);
        }
    });
    
    // Touch (mobile)
    let touchStartY = 0;
    let touchEndY = 0;
    const swipeThreshold = 40;
    
    window.addEventListener('touchstart', function(e) {
        if (e.touches && e.touches.length > 0) {
            touchStartY = e.touches[0].clientY;
            touchEndY = touchStartY;
        }
    }, { passive: true });
    
    window.addEventListener('touchmove', function(e) {
        if (e.touches && e.touches.length > 0) {
            touchEndY = e.touches[0].clientY;
        }
    }, { passive: true });
    
    window.addEventListener('touchend', function() {
        if (isSnapping) return;
        const delta = touchEndY - touchStartY;
        const idx = getCurrentSlideIndex();
        if (Math.abs(delta) > swipeThreshold) {
            if (delta < 0) {
                scrollToSlide(idx + 1);
            } else {
                scrollToSlide(idx - 1);
            }
        }
    });
    
    // Обработчик скролла с оптимизацией производительности
    let ticking = false;
    window.addEventListener('scroll', function() {
        if (!ticking) {
            window.requestAnimationFrame(function() {
                updateOnScroll();
                ticking = false;
            });
            ticking = true;
        }
    });
    
    // Обработчик изменения размера окна
    window.addEventListener('resize', function() {
        initializePositions();
        updateOnScroll();
    });
    
    // Инициализация
    initializePositions();
    
    // Небольшая задержка для правильной инициализации после загрузки
    setTimeout(function() {
        initializePositions();
        updateOnScroll();
    }, 100);
    
    // Первоначальная установка
    updateOnScroll();
});

