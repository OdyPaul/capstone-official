import "./css/table.css";
import { FaTimes, FaCog } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { fetchUsers } from "../../features/users/userSlice";

function Table() {
  const dispatch = useDispatch();
    const { list: users, isLoading, isError, message } = useSelector(
  (state) => state.users
);

  const { user } = useSelector((state) => state.auth); // logged-in user

  useEffect(() => {
    if (user && user.token) {
      dispatch(fetchUsers());
    }
  }, [dispatch, user]);

  if (isLoading) return <p>Loading users...</p>;
  if (isError) return <p className="text-danger">Error: {message}</p>;

  return (
    <section className="intro ">
      <div className="bg-image h-100">
        <div className="mask d-flex align-items-center h-100">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-12">
                <div
                  className="card shadow-2-strong"
                  style={{ backgroundColor: "#f5f7fa" }}
                >
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-borderless mb-0">
                        <thead>
                          <tr>
                            <th scope="col">
                              <div className="form-check">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                />
                              </div>
                            </th>
                            <th scope="col">ID</th>
                            <th scope="col">NAME</th>
                            <th scope="col">EMAIL</th>
                            <th scope="col">ROLE</th>
                            <th scope="col">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          
                          {users
                          .filter((u) => u.role === "staff" || u.role === "admin")
                          .map((u, index) => (
                            <tr key={u._id}>
                              <th scope="row">
                                <div className="form-check">
                                   <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                </div>
                              </th>
                              <td>{index + 1}</td>
                              <td>{u.name}</td>
                              <td>{u.email}</td>
                              <td>{u.role}</td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm px-3 me-2"
                                >
                                  <FaCog />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm px-3"
                                >
                                  <FaTimes />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {users.length === 0 && <p>No users found.</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Table;
