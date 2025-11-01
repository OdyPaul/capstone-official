import React from 'react';
import Header from '../../../components/public/Header';
import Footer from '../../../components/public/Footer';
import bgLogo from '../../../assets/public/services.png';


function Services() {
  return (
    <section className="bg-white d-flex flex-column min-vh-100">
      <Header />

      <div className="container-xxl flex-grow-1">
        {/* reduce bottom space above the banner */}
        <div className="row align-items-center g-5 pt-5 pb-0">
          {/* LEFT */}
          <div className="col-12 col-lg-6 order-2 order-lg-1">
            <p className="text-secondary text-uppercase mb-2 fw-semibold" style={{ letterSpacing: '.08em' }}>
              Get help with
            </p>
            <h1 className="fw-bold text-dark lh-1 display-4 mb-3">
              <span className="d-block">Data <span className="text-primary">protection</span></span>
              landing page
            </h1>
            <p className="text-secondary fs-5 mb-4 pe-lg-5">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed diam nonummy nibh euismod.
            </p>
            <div className="d-inline-flex align-items-center rounded-pill border px-4 py-2 mb-4" style={{ gap: '10px' }}>
              <span className="fw-bold fs-5">• • • • • •</span>
            </div>
            <div className="d-flex align-items-center gap-3">
              <a href="#" className="btn btn-dark btn-lg px-4">Start</a>
              <i className="fas fa-arrow-right fs-4 text-dark"></i>
            </div>
          </div>

          {/* RIGHT */}
          <div className="col-12 col-lg-6 text-center order-1 order-lg-2">
            <img
              src={bgLogo}
              alt="Data protection illustration"
              className="img-fluid"
              style={{ maxHeight: '520px', objectFit: 'contain' }}
            />
          </div>
        </div>
      </div>


      {/* Turn off sticky margin so the banner touches the footer */}
      <Footer sticky={false} />
    </section>
  );
}

export default Services;
