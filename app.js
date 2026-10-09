let token = "";
let orders = [];
let telemetry = [];
const byId = (id) => document.getElementById(id);
const notice = (message) => {
  byId("notice").textContent = message;
};
async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && token) logout();
    throw new Error(data.error ?? "Operação indisponível");
  }
  return data;
}
function logout() {
  token = "";
  orders = [];
  telemetry = [];
  byId("workspace").hidden = true;
  byId("auth").hidden = false;
  byId("logout").hidden = true;
  render();
}
function render() {
  for (const [id, state] of [
    ["open-count", "open"],
    ["active-count", "acknowledged"],
    ["closed-count", "closed"],
  ])
    byId(id).textContent = String(
      orders.filter((row) => row.status === state).length,
    );
  byId("orders").replaceChildren();
  const filter = byId("filter").value.trim().toLocaleLowerCase();
  for (const row of orders.filter((row) =>
    `${row.asset_tag} ${row.title}`.toLocaleLowerCase().includes(filter),
  )) {
    const tr = document.createElement("tr");
    for (const value of [row.asset_tag, row.title, row.priority, row.status]) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.append(td);
    }
    const td = document.createElement("td");
    if (row.status !== "closed") {
      const button = document.createElement("button");
      button.textContent = row.status === "open" ? "Iniciar" : "Concluir";
      button.onclick = async () => {
        button.disabled = true;
        try {
          await request("/api/operations", {
            method: "POST",
            body: JSON.stringify({
              action: "transition",
              id: row.id,
              status: row.status === "open" ? "acknowledged" : "closed",
            }),
          });
          await refresh();
        } catch (error) {
          notice(error.message);
          button.disabled = false;
        }
      };
      td.append(button);
    }
    tr.append(td);
    byId("orders").append(tr);
  }
  byId("telemetry").textContent = JSON.stringify(telemetry, null, 2);
}
async function refresh() {
  const data = await request("/api/operations");
  orders = data.workOrders;
  telemetry = data.telemetry;
  render();
  notice(`${orders.length} ordens carregadas.`);
}
byId("login").onsubmit = async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button");
  button.disabled = true;
  try {
    const data = await request("/api/session", {
      method: "POST",
      body: JSON.stringify({
        email: byId("email").value,
        password: byId("password").value,
        action: byId("auth-action").value,
      }),
    });
    byId("password").value = "";
    if (data.confirmationRequired)
      return notice("Confirme seu e-mail e entre na conta.");
    token = data.accessToken;
    byId("auth").hidden = true;
    byId("workspace").hidden = false;
    byId("logout").hidden = false;
    await refresh();
  } catch (error) {
    notice(error.message);
  } finally {
    button.disabled = false;
  }
};
byId("create").onsubmit = async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button");
  button.disabled = true;
  try {
    await request("/api/operations", {
      method: "POST",
      body: JSON.stringify({
        assetTag: byId("asset").value,
        title: byId("title").value,
        priority: byId("priority").value,
      }),
    });
    byId("title").value = "";
    await refresh();
  } catch (error) {
    notice(error.message);
  } finally {
    button.disabled = false;
  }
};
byId("logout").onclick = logout;
byId("filter").oninput = render;
byId("refresh").onclick = () =>
  refresh().catch((error) => notice(error.message));
byId("export").onclick = () => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify({ workOrders: orders, telemetry }, null, 2)], {
      type: "application/json",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "operations.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
