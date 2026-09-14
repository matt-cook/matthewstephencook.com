import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';
import './styles.css';

const gallery = document.querySelector('#project-gallery');
if (gallery) {
  const arrow = '<svg aria-hidden="true" class="pswp__icn" viewBox="0 0 36 36"><polyline class="outer-color" points="21,29 10,18 21,7"/><polyline class="inner-color" points="21,29 10,18 21,7"/></svg>';
  const close = '<svg aria-hidden="true" class="pswp__icn" viewBox="0 0 36 36"><path class="outer-color" d="M10 10 26 26 M26 10 10 26"/><path class="inner-color" d="M10 10 26 26 M26 10 10 26"/></svg>';
  const orderedImages = [...gallery.querySelectorAll('.gallery-image')].sort((a, b) => Number(a.dataset.index) - Number(b.dataset.index));
  const lightbox = new PhotoSwipeLightbox({
    gallery,
    children: orderedImages,
    pswpModule: () => import('photoswipe'),
    bgOpacity: .9,
    paddingFn: () => { const padding = parseFloat(getComputedStyle(document.documentElement).fontSize) * 2.5; return { top: padding, right: padding, bottom: padding, left: padding }; },
    arrowPrevSVG: arrow,
    arrowNextSVG: arrow,
    closeSVG: close,
    zoom: false,
    counter: false,
    closeOnVerticalDrag: true,
    wheelToZoom: false,
    imageClickAction: 'close',
    tapAction: 'close',
    doubleTapAction: false,
    secondaryZoomLevel: 'fit',
    maxZoomLevel: 'fit',
    showHideAnimationType: 'zoom',
    returnFocus: true,
    trapFocus: true
  });
  let idleTimer;
  let detach;
  lightbox.on('uiRegister', () => {
    lightbox.pswp.ui.registerElement({
      name: 'custom-caption', order: 9, isButton: false, appendTo: 'root',
      onInit: (element, pswp) => pswp.on('change', () => {
        const caption = pswp.currSlide.data.element?.dataset.caption || '';
        element.replaceChildren();
        if (caption) { const span = document.createElement('span'); span.textContent = caption; element.append(span); }
      })
    });
  });
  lightbox.on('afterInit', () => {
    const pswp = lightbox.pswp;
    const showControls = () => { clearTimeout(idleTimer); pswp.element.classList.remove('controls-idle'); idleTimer = setTimeout(() => pswp.element.classList.add('controls-idle'), 2000); };
    const closeOnScroll = event => { if (!event.ctrlKey) pswp.close(); };
    pswp.element.addEventListener('pointermove', showControls);
    pswp.element.addEventListener('keydown', showControls);
    pswp.element.addEventListener('wheel', closeOnScroll, { passive: true });
    showControls();
    detach = () => { clearTimeout(idleTimer); pswp.element.removeEventListener('pointermove', showControls); pswp.element.removeEventListener('keydown', showControls); pswp.element.removeEventListener('wheel', closeOnScroll); };
  });
  lightbox.on('destroy', () => detach?.());
  lightbox.init();
}
