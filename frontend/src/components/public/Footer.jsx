import React from 'react';

function Footer({ sticky = true }) {
  return (
    <footer className={`bg-success text-white ${sticky ? 'mt-auto' : ''} py-5`}>
      <div className="container">
        <div className="row gy-4">
          <div className="col-md-6">
            <h5 className="fw-bold mb-2">About</h5>
            <p className="mb-0 opacity-75">
              Brief description or tagline goes here. You can replace this with your own content.
            </p>
          </div>
          <div className="col-6 col-md-3">
            <h6 className="fw-semibold mb-3">Quick Links</h6>
            <ul className="list-unstyled mb-0">
              <li><a className="text-white text-decoration-none opacity-90" href="#">Home</a></li>
              <li><a className="text-white text-decoration-none opacity-90" href="#">Service</a></li>
              <li><a className="text-white text-decoration-none opacity-90" href="#">Portfolio</a></li>
              <li><a className="text-white text-decoration-none opacity-90" href="#">Contact Us</a></li>
            </ul>
          </div>
          <div className="col-6 col-md-3">
            <h6 className="fw-semibold mb-3">Contact</h6>
            <ul className="list-unstyled small mb-0 opacity-90">
              <li>123 Sample St., City</li>
              <li>email@example.com</li>
              <li>+1 (555) 123-4567</li>
            </ul>
          </div>
        </div>
        <hr className="border-light opacity-25 my-4" />
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3">
          <span className="small opacity-90">© {new Date().getFullYear()} Logo. All rights reserved.</span>
          <div className="d-flex gap-3">
            <a className="text-white text-decoration-none opacity-90" href="#">Privacy</a>
            <a className="text-white text-decoration-none opacity-90" href="#">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
