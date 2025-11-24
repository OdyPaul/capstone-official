import axios from "axios";
import qs from "qs";
import { API_URL } from "../../../config";

const shapeRow = (r = {}) => {
  const profile = r.studentProfile || {};
  const account = r.studentAccount || {};

  // Prefer denormalized fields; fall back to joined profile; then account
   const profileId = profile?._id || r.studentId || null; // for routing to /students/:id
   const studentNumber = r.studentNumber ?? profile?.studentNumber ?? null; // <-- ensure present
  const fullName =
    r.studentFullName ??
    profile?.fullName ??
    account?.username ??
    account?.email ??
    null;
  const program = r.studentProgram ?? profile?.program ?? null;
  const photoUrl = r.studentPhotoUrl ?? profile?.photoUrl ?? account?.profilePicture ?? null;

  return {
    ...r,
    profileId,
    studentNumber,
    fullName,
    program,
    photoUrl,
    vcType: String(r.type || "").toUpperCase(),          // "TOR" | "DIPLOMA"
    vcPurpose: String(r.purpose || "").toLowerCase(),    // normalized
    anchorNow: !!r.anchorNow,                         // ✅ NEW
    draftId: r.draft || null,                         // ✅ NEW
  };
};

const getAllRequests = async (filters, token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
    params: filters || {},
    paramsSerializer: (p) => qs.stringify(p, { arrayFormat: "repeat" }),
  };
  const { data } = await axios.get(`${API_URL}/api/vc-requests`, config);
  const list = Array.isArray(data) ? data : [];
  return list.map(shapeRow); // ⬅️ ensure rows are always flat/consistent
};

const reviewRequest = async ({ id, status }, token) => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const { data } = await axios.patch(`${API_URL}/api/vc-requests/${id}`, { status }, config);
  // NOTE: response might be minimal; keep as-is, slice will merge over previous shaped row
  return data;
};

// NEW: delete
const deleteRequest = async (id, token) => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  await axios.delete(`${API_URL}/api/vc-requests/${id}`, config);
  return { _id: id };
};

const requestsService = { getAllRequests, reviewRequest, deleteRequest };
export default requestsService;
