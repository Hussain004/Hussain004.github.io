/* ===================================================================
 * Flare 1.0.0 - Main JS
 *
 * ------------------------------------------------------------------- */

(function($) {

    "use strict";
    
    const cfg = {
                scrollDuration : 800, // smoothscroll duration
                mailChimpURL   : ''   // mailchimp url
                };
    const $WIN = $(window);


    // Add the User Agent to the <html>
    // will be used for IE10/IE11 detection (Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0; rv:11.0))
    // const doc = document.documentElement;
    // doc.setAttribute('data-useragent', navigator.userAgent);


   /* preloader
    * -------------------------------------------------- */
    const ssPreloader = function() {

        $("html").addClass('ss-preload');

        $WIN.on('load', function() {

            // force page scroll position to top at page refresh
            $('html, body').animate({ scrollTop: 0 }, 'normal');

            // will first fade out the loading animation 
            $("#loader").fadeOut("slow", function() {
                // will fade out the whole DIV that covers the website.
                $("#preloader").delay(300).fadeOut("slow");
            }); 
            
            // for hero content animations 
            $("html").removeClass('ss-preload');
            $("html").addClass('ss-loaded');

        });
    };



   /* pretty print
    * -------------------------------------------------- */
    const ssPrettyPrint = function() {
        $('pre').addClass('prettyprint');
        $( document ).ready(function() {
            prettyPrint();
        });
    };



   /* move header
    * -------------------------------------------------- */
    const ssMoveHeader = function () {

        const $hero = $('.s-hero'),
              $hdr = $('.s-header'),
              triggerHeight = $hero.outerHeight() - 170;


        $WIN.on('scroll', function () {

            let loc = $WIN.scrollTop();

            if (loc > triggerHeight) {
                $hdr.addClass('sticky');
            } else {
                $hdr.removeClass('sticky');
            }

            if (loc > triggerHeight + 20) {
                $hdr.addClass('offset');
            } else {
                $hdr.removeClass('offset');
            }

            if (loc > triggerHeight + 150) {
                $hdr.addClass('scrolling');
            } else {
                $hdr.removeClass('scrolling');
            }

        });

    };



   /* mobile menu
    * ---------------------------------------------------- */ 
    const ssMobileMenu = function() {

        const $toggleButton = $('.s-header__menu-toggle');
        const $headerContent = $('.s-header__content');
        const $siteBody = $("body");

        $toggleButton.on('click', function(event){
            event.preventDefault();
            $toggleButton.toggleClass('is-clicked');
            $siteBody.toggleClass('menu-is-open');
        });

        $headerContent.find('.s-header__nav a, .btn').on("click", function() {

            // at 900px and below
            if (window.matchMedia('(max-width: 900px)').matches) {
                $toggleButton.toggleClass('is-clicked');
                $siteBody.toggleClass('menu-is-open');
            }
        });

        $WIN.on('resize', function() {

            // above 900px
            if (window.matchMedia('(min-width: 901px)').matches) {
                if ($siteBody.hasClass("menu-is-open")) $siteBody.removeClass("menu-is-open");
                if ($toggleButton.hasClass("is-clicked")) $toggleButton.removeClass("is-clicked");
            }
        });

    };



   /* photoswipe
    * ----------------------------------------------------- */
    const ssPhotoswipe = function() {
        const items = [],
              $pswp = $('.pswp')[0],
              $folioItems = $('.folio-item');

        // get items
        $folioItems.each( function(i) {

            let $folio = $(this),
                $thumbLink =  $folio.find('.folio-item__thumb-link'),
                $title = $folio.find('.folio-item__title'),
                $caption = $folio.find('.folio-item__caption'),
                $titleText = '<h4>' + $.trim($title.html()) + '</h4>',
                $captionText = $.trim($caption.html()),
                $href = $thumbLink.attr('href'),
                $size = $thumbLink.data('size').split('x'),
                $width  = $size[0],
                $height = $size[1];
        
            let item = {
                src  : $href,
                w    : $width,
                h    : $height
            }

            if ($caption.length > 0) {
                item.title = $.trim($titleText + $captionText);
            }

            items.push(item);
        });

        // bind click event
        $folioItems.each(function(i) {

            $(this).find('.folio-item__thumb-link').on('click', function(e) {
                e.preventDefault();
                let options = {
                    index: i,
                    showHideOpacity: true
                }

                // initialize PhotoSwipe
                let lightBox = new PhotoSwipe($pswp, PhotoSwipeUI_Default, items, options);
                lightBox.init();
            });

        });
    };



   /* slick slider
    * ------------------------------------------------------ */
    const ssSlickSlider = function() {

        $('.clients').slick({
            arrows: false,
            dots: true,
            infinite: true,
            slidesToShow: 5,
            slidesToScroll: 1,
            pauseOnFocus: false,
            autoplaySpeed: 1000,
            responsive: [
                {
                    breakpoint: 1000,
                    settings: {
                        slidesToShow: 4
                    }
                },
                {
                    breakpoint: 800,
                    settings: {
                        slidesToShow: 3,
                        slidesToScroll: 2
                    }
                },
                {
                    breakpoint: 500,
                    settings: {
                        slidesToShow: 2,
                        slidesToScroll: 2
                    }
                }

            ]
        });

        $('.testimonial-slider').slick({
            arrows: true,
            dots: false,
            infinite: true,
            slidesToShow: 1,
            slidesToScroll: 1,
            pauseOnFocus: false,
            autoplaySpeed: 1500,
            responsive: [
                {
                    breakpoint: 600,
                    settings: {
                        arrows: false,
                        dots: true
                    }
                }
            ]
        });

    };


   /* animate on scroll
    * ------------------------------------------------------ */
    const ssAOS = function() {
        
        AOS.init( {
            offset: 100,
            duration: 600,
            easing: 'ease-in-out',
            delay: 300,
            once: true,
            disable: 'mobile'
        });

    };



   /* alert boxes
    * ------------------------------------------------------ */
    const ssAlertBoxes = function() {

        $('.alert-box').on('click', '.alert-box__close', function() {
            $(this).parent().fadeOut(500);
        }); 

    };

    
   /* smooth scrolling
    * ------------------------------------------------------ */
    const ssSmoothScroll = function() {
        
        $('.smoothscroll').on('click', function (e) {
            const target = this.hash;
            const $target = $(target);
            
            e.preventDefault();
            e.stopPropagation();

            $('html, body').stop().animate({
                'scrollTop': $target.offset().top
            }, cfg.scrollDuration, 'swing').promise().done(function () {
                window.location.hash = target;
            });
        });

    };


   /* back to top
    * ------------------------------------------------------ */
    const ssBackToTop = function() {
        
        const pxShow = 800;
        const $goTopButton = $(".ss-go-top")

        // Show or hide the button
        if ($(window).scrollTop() >= pxShow) $goTopButton.addClass('link-is-visible');

        $(window).on('scroll', function() {
            if ($(window).scrollTop() >= pxShow) {
                if(!$goTopButton.hasClass('link-is-visible')) $goTopButton.addClass('link-is-visible')
            } else {
                $goTopButton.removeClass('link-is-visible')
            }
        });
    };



   /* PDF modal functionality
    * ------------------------------------------------------ */
    const openPdfModal = function(pdfPath) {
        // Create modal HTML
        const modalHtml = `
            <div id="pdfModal" class="pdf-modal">
                <div class="pdf-modal-content">
                    <div class="pdf-modal-header">
                        <h3>Certificate Preview</h3>
                        <button class="pdf-modal-close" onclick="closePdfModal()">&times;</button>
                    </div>
                    <div class="pdf-modal-body">
                        <div class="pdf-loading" id="pdfLoading">
                            <div class="loading-spinner"></div>
                            <p>Loading certificate...</p>
                        </div>
                        <iframe id="pdfFrame" src="${pdfPath}#toolbar=0&navpanes=0&scrollbar=0" width="100%" height="100%" frameborder="0" style="display: none;">
                            <p>Your browser does not support PDF viewing. <a href="${pdfPath}" target="_blank">Click here to download the PDF</a></p>
                        </iframe>
                        <div class="pdf-error" id="pdfError" style="display: none;">
                            <div class="error-icon">⚠️</div>
                            <h4>Unable to load PDF</h4>
                            <p>The PDF preview is not available at the moment.</p>
                            <a href="${pdfPath}" target="_blank" class="btn btn--primary">Open PDF in New Tab</a>
                        </div>
                    </div>
                    <div class="pdf-modal-footer">
                        <a href="${pdfPath}" target="_blank" class="btn btn--primary">Open in New Tab</a>
                        <button onclick="closePdfModal()" class="btn btn--stroke">Close</button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to body
        $('body').append(modalHtml);
        
        // Show modal with animation
        $('#pdfModal').fadeIn(300);
        
        // Prevent body scroll
        $('body').addClass('modal-open');

        // Handle iframe load events
        const iframe = document.getElementById('pdfFrame');
        const loadingDiv = document.getElementById('pdfLoading');
        const errorDiv = document.getElementById('pdfError');

        // Show PDF after loading
        iframe.onload = function() {
            setTimeout(() => {
                loadingDiv.style.display = 'none';
                iframe.style.display = 'block';
            }, 1000);
        };

        // Handle errors
        iframe.onerror = function() {
            loadingDiv.style.display = 'none';
            errorDiv.style.display = 'block';
        };

        // Fallback timeout
        setTimeout(() => {
            if (iframe.style.display === 'none' && errorDiv.style.display === 'none') {
                loadingDiv.style.display = 'none';
                errorDiv.style.display = 'block';
            }
        }, 5000);

        // Close modal when clicking outside
        $('#pdfModal').on('click', function(e) {
            if (e.target === this) {
                closePdfModal();
            }
        });

        // Close modal with Escape key
        $(document).on('keydown.pdfModal', function(e) {
            if (e.keyCode === 27) { // Escape key
                closePdfModal();
            }
        });
    };

    const closePdfModal = function() {
        $('#pdfModal').fadeOut(300, function() {
            $(this).remove();
        });
        $('body').removeClass('modal-open');
        $(document).off('keydown.pdfModal');
    };

    // Make functions globally available
    window.openPdfModal = openPdfModal;
    window.closePdfModal = closePdfModal;


   /* initialize
    * ------------------------------------------------------ */
    (function ssInit() {

        ssPreloader();
        ssPrettyPrint();
        ssMoveHeader();
        ssMobileMenu();
        ssPhotoswipe();
        ssSlickSlider();
        ssAOS();
        ssAlertBoxes();
        ssSmoothScroll();
        ssBackToTop();

    })();

})(jQuery);