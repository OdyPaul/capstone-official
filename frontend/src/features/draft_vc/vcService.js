// src/features/draft_vc/vcService.js
import axios from "axios";

// Create multiple VC drafts
const createDrafts = async (drafts) => {
  console.log("👉 Posting draft payload:", drafts); // ✅ fixed variable
  const res = await axios.post("/api/vc/draft", drafts); 
  return res.data; 
};

const getDrafts = async () => {
  const res = await axios.get("/api/vc/draft");
  return res.data;
};

const vcService = {
  createDrafts,
  getDrafts,
};

export default vcService;
