import React, { useCallback } from 'react';
import Header from '../../components/public/Header';
import Footer from '../../components/public/Footer';

// Images (swap with your real assets)
import heroIllustration from '../../assets/public/UI_login.png';
import stepImg1 from '../../assets/public/UI_login.png';
import stepImg2 from '../../assets/public/UI_login.png';
import stepImg3 from '../../assets/public/UI_login.png';
import stepImg4 from '../../assets/public/UI_login.png';

function Index() {
  const scrollToHowItWorks = useCallback((e) => {
    e.preventDefault();
    const el = document.getElementById('how-it-works');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <section className="min-vh-100 bg-white d-flex flex-column">
      <Header active="home" />

      {/* Local CSS for numbered indicators */}
      <style>{`
        #stepsCarousel .carousel-indicators .num-indicator {
          width: auto;
          height: auto;
          padding: .35rem .65rem;
          margin: 0 .25rem;
          border-radius: .5rem;
          background-color: transparent;
          color: #6c757d;            /* text-secondary */
          border: 1px solid #dee2e6; /* gray border */
          text-indent: 0;            /* show numbers */
          opacity: 1;                /* don't dim inactive */
          font-weight: 600;
        }
        #stepsCarousel .carousel-indicators .num-indicator.active {
          background-color: #198754; /* Bootstrap success */
          color: #fff;
          border-color: #198754;
        }
      `}</style>

      {/* HERO: text + illustration */}
      <div className="container-xxl">
        <div className="row align-items-center g-5 py-5">
          {/* Left: Text */}
          <div className="col-12 col-lg-6 order-2 order-lg-1">
            <h1 className="fw-bold text-dark lh-1 display-4 mb-3">
              PSAU <span className="text-success">Credential Issuance</span>
            </h1>

            <p className="text-secondary fs-5 mb-3" style={{ maxWidth: 560 }}>
              Get your credentials online now —{' '}
              <a
                href="#how-it-works"
                onClick={scrollToHowItWorks}
                className="text-success fw-semibold text-decoration-underline"
              >
                click here
              </a>
              .
            </p>

            <div className="d-flex align-items-center gap-3 flex-wrap mt-3">
              <button className="btn btn-success btn-lg px-4" onClick={scrollToHowItWorks}>
                See how it works
              </button>
              <div className="d-inline-flex align-items-center rounded-pill border px-4 py-2">
                <span className="fw-bold">• • • • • •</span>
              </div>
            </div>
          </div>

          {/* Right: Image */}
          <div className="col-12 col-lg-6 text-center order-1 order-lg-2">
            <img
              src={heroIllustration}
              alt="Credential issuance illustration"
              className="img-fluid"
              style={{ maxHeight: '520px', objectFit: 'contain' }}
              loading="eager"
            />
          </div>
        </div>
      </div>

      {/* HOW IT WORKS (Carousel) */}
      <section id="how-it-works" className="bg-light py-5">
        <div className="container-xxl">
          <div className="d-flex justify-content-between align-items-end mb-4">
            <h2 className="fw-bold mb-0">How it works</h2>
            <small className="text-secondary">Follow these simple steps</small>
          </div>

          <div id="stepsCarousel" className="carousel slide position-relative" data-bs-ride="carousel">
            {/* Top-right NEXT button */}
            <button
              type="button"
              className="btn btn-success btn-sm position-absolute top-0 end-0 mt-3 me-3 z-3"
              data-bs-target="#stepsCarousel"
              data-bs-slide="next"
              aria-label="Next step"
            >
              Next
            </button>

            {/* Numbered indicators */}
            <div className="carousel-indicators">
              <button
                type="button"
                data-bs-target="#stepsCarousel"
                data-bs-slide-to="0"
                className="active num-indicator"
                aria-current="true"
                aria-label="Step 1"
              >
                1
              </button>
              <button
                type="button"
                data-bs-target="#stepsCarousel"
                data-bs-slide-to="1"
                className="num-indicator"
                aria-label="Step 2"
              >
                2
              </button>
              <button
                type="button"
                data-bs-target="#stepsCarousel"
                data-bs-slide-to="2"
                className="num-indicator"
                aria-label="Step 3"
              >
                3
              </button>
              <button
                type="button"
                data-bs-target="#stepsCarousel"
                data-bs-slide-to="3"
                className="num-indicator"
                aria-label="Step 4"
              >
                4
              </button>
            </div>

            {/* Slides */}
            <div className="carousel-inner">
              {/* 1 */}
              <div className="carousel-item active" data-bs-interval="6000">
                <div className="row align-items-center g-5" style={{ minHeight: '50vh' }}>
                  <div className="col-12 col-lg-6">
                    <h3 className="fw-bold mb-2">Download AAS app on iOS/Android</h3>
                    <p className="text-secondary mb-0">
                      Get the AAS app from the App Store or Google Play to start your credential journey.
                    </p>
                  </div>
                  <div className="col-12 col-lg-6 text-center">
                    <img
                      src={stepImg1}
                      alt="Download app"
                      className="img-fluid"
                      style={{ maxHeight: 420, objectFit: 'contain' }}
                    />
                  </div>
                </div>
              </div>

              {/* 2 */}
              <div className="carousel-item" data-bs-interval="6000">
                <div className="row align-items-center g-5" style={{ minHeight: '50vh' }}>
                  <div className="col-12 col-lg-6">
                    <h3 className="fw-bold mb-2">Create account</h3>
                    <p className="text-secondary mb-0">Sign up using your information. It only takes a minute.</p>
                  </div>
                  <div className="col-12 col-lg-6 text-center">
                    <img
                      src={stepImg2}
                      alt="Create account"
                      className="img-fluid"
                      style={{ maxHeight: 420, objectFit: 'contain' }}
                    />
                  </div>
                </div>
              </div>

              {/* 3 */}
              <div className="carousel-item" data-bs-interval="6000">
                <div className="row align-items-center g-5" style={{ minHeight: '50vh' }}>
                  <div className="col-12 col-lg-6">
                    <h3 className="fw-bold mb-2">Verify your account</h3>
                    <p className="text-secondary mb-0">
                      Complete verification to secure your identity and enable issuance.
                    </p>
                  </div>
                  <div className="col-12 col-lg-6 text-center">
                    <img
                      src={stepImg3}
                      alt="Verify account"
                      className="img-fluid"
                      style={{ maxHeight: 420, objectFit: 'contain' }}
                    />
                  </div>
                </div>
              </div>

              {/* 4 */}
              <div className="carousel-item" data-bs-interval="6000">
                <div className="row align-items-center g-5" style={{ minHeight: '50vh' }}>
                  <div className="col-12 col-lg-6">
                    <h3 className="fw-bold mb-2">Request VC on the app</h3>
                    <p className="text-secondary mb-0">
                      Choose the credential you need and submit your request in the AAS app.
                    </p>
                  </div>
                  <div className="col-12 col-lg-6 text-center">
                    <img
                      src={stepImg4}
                      alt="Request VC"
                      className="img-fluid"
                      style={{ maxHeight: 420, objectFit: 'contain' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* No default arrow controls (hidden/removed) */}
          </div>
        </div>
      </section>

      <Footer />
    </section>
  );
}

export default Index;
