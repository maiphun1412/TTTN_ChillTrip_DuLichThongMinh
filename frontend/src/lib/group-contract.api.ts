const API_BASE_URL = "/backend-api";

function getAuthHeaders() {
  const token =
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token") ||
    "";

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getAdminGroupContracts() {
  const res = await fetch(`${API_BASE_URL}/admin/group-contracts`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.message || "Không lấy được danh sách tour đoàn");
  }

  return json.data || [];
}

export async function approveGroupContract(id: string | number) {
  const res = await fetch(`${API_BASE_URL}/admin/group-contracts/${id}/approve`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.message || "Không duyệt được yêu cầu tour đoàn");
  }

  return json.data;
}

export async function rejectGroupContract(id: string | number) {
  const res = await fetch(`${API_BASE_URL}/admin/group-contracts/${id}/reject`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.message || "Không từ chối được yêu cầu tour đoàn");
  }

  return json.data;
}