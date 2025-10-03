import React, { useState } from "react";
import { Modal, Button } from "react-bootstrap";

function LoadStudentModal({ show, onClose, onConfirm }) {
  // Colleges + their programs
  const collegePrograms = {
    CoECS: ["CIVILENG", "COMPENG", "IT"],
    CoEd: ["BSED", "BTLE"],
    CVM: ["DVM"],
  };

  // ✅ Add "All Colleges" option
  const allCollegesOption = "All Colleges";

  const [college, setCollege] = useState(allCollegesOption);
  const [program, setProgram] = useState("All");
  const [year, setYear] = useState("All"); // ✅ default to All

  // Generate year list (descending order + "All" first)
  const years = ["All"];
  for (let y = new Date().getFullYear(); y >= 1974; y--) {
    years.push(y);
  }

  const handleSubmit = () => {
    let programs = [];

    if (college === allCollegesOption) {
      // ✅ Combine all programs from all colleges
      programs = Object.values(collegePrograms).flat();
    } else {
      if (!collegePrograms[college]) {
        alert(`${college} students are not available yet.`);
        return;
      }
      programs = program === "All" ? collegePrograms[college] : [program];
    }

    // Build filter (we only need programs + optional year)
    const filter = { programs };

    if (year !== "All") {
      filter.year = year;
    }

    onConfirm(filter);
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Load Students</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* College Selector */}
        <div className="mb-3">
          <label className="form-label">College</label>
          <select
            className="form-select"
            value={college}
            onChange={(e) => {
              const newCollege = e.target.value;
              setCollege(newCollege);
              setProgram("All"); // reset program when switching college
            }}
          >
            {/* ✅ Add All Colleges as first option */}
            <option value={allCollegesOption}>{allCollegesOption}</option>
            {Object.keys(collegePrograms).map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>

        {/* Program Selector (hide if "All Colleges") */}
        {college !== allCollegesOption && (
          <div className="mb-3">
            <label className="form-label">Program</label>
            <select
              className="form-select"
              value={program}
              onChange={(e) => setProgram(e.target.value)}
            >
              <option value="All">All</option>
              {collegePrograms[college].map((prog) => (
                <option key={prog} value={prog}>
                  {prog}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Year Selector */}
        <div className="mb-3">
          <label className="form-label">Year Graduated</label>
          <select
            className="form-select"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit}>
          Load
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default LoadStudentModal;
